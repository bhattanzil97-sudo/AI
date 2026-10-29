import { NextRequest } from 'next/server';
import { cleanReasoning } from '@/lib/clean-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedOllamaModels: { endpoint: string; models: string[]; timestamp: number } | null = null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      model = 'qwen3.5:4b',
      temperature = 0.3,
      endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
      systemPrompt,
    } = body;

    const baseEndpoint = (endpoint || 'http://localhost:11434').replace(/\/$/, '');

    // Format messages for Ollama with strict concise instructions
    const formattedMessages: any[] = [];

    const conciseDirective = `You are CHAT AI in Offline Mode.
STRICT INSTRUCTIONS:
1. Answer ONLY what the user asks. Provide ONLY the specific information requested.
2. Keep your answer short, clear, direct, accurate, and to the point.
3. NEVER output internal thought process, reasoning steps, tone analysis, user intent breakdown, or draft options. Output ONLY the direct final answer.
4. The length of the answer must strictly match the scope of the question:
   - For greetings (e.g. "hi", "hello"): respond with a single short, friendly sentence.
   - For factual or direct questions: answer directly in 1-2 concise sentences without preamble or filler.
   - For code: provide only the requested code and minimal necessary explanation.
5. Do NOT add extra explanations, background history, or unsolicited details unless the user specifically asks for them.`;

    formattedMessages.push({
      role: 'system',
      content: conciseDirective,
    });

    for (const msg of messages) {
      const ollamaMsg: any = {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content || '',
      };

      if (msg.attachments && msg.attachments.length > 0) {
        const imageB64: string[] = [];
        for (const att of msg.attachments) {
          if (att.dataUrl && att.type.startsWith('image/')) {
            const b64 = att.dataUrl.split(',')[1] || att.dataUrl;
            imageB64.push(b64);
          } else if (att.textContent) {
            ollamaMsg.content += `\n[Attached File: ${att.name}]\n${att.textContent}\n`;
          }
        }
        if (imageB64.length > 0) {
          ollamaMsg.images = imageB64;
        }
      }

      formattedMessages.push(ollamaMsg);
    }

    // Prepend concise rule to the active user query
    const lastOllamaUser = [...formattedMessages].reverse().find((m) => m.role === 'user');
    if (lastOllamaUser && lastOllamaUser.content) {
      lastOllamaUser.content = `[Rule: Give ONLY a short, direct answer to what is asked. Do not add extra explanations or details.]\n\n${lastOllamaUser.content}`;
    }

    // Check installed models in Ollama with in-memory caching to avoid round-trip on every message
    let targetModel = model;
    const now = Date.now();
    let installed: string[] = [];

    if (
      cachedOllamaModels &&
      cachedOllamaModels.endpoint === baseEndpoint &&
      now - cachedOllamaModels.timestamp < 60000
    ) {
      installed = cachedOllamaModels.models;
    } else {
      try {
        const tagsRes = await fetch(`${baseEndpoint}/api/tags`, {
          signal: AbortSignal.timeout(600),
        });
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          installed = (tagsData.models || []).map((m: any) => m.name);
          cachedOllamaModels = { endpoint: baseEndpoint, models: installed, timestamp: now };
        }
      } catch {}
    }

    if (installed.length > 0 && !installed.includes(targetModel)) {
      const match = installed.find((m) => m.startsWith(targetModel.split(':')[0]));
      targetModel = match || installed[0];
    }

    const lastUserQuery = (messages[messages.length - 1]?.content || '').toLowerCase();
    const isDetailed =
      lastUserQuery.includes('detail') ||
      lastUserQuery.includes('explain') ||
      lastUserQuery.includes('step by step') ||
      lastUserQuery.includes('code') ||
      lastUserQuery.includes('write');

    const maxTokens = isDetailed ? 512 : 150;

    const ollamaPayload = {
      model: targetModel,
      messages: formattedMessages,
      stream: true,
      think: false, // Critical: Disables chain-of-thought/thinking token phase for Qwen/DeepSeek models
      keep_alive: '24h', // Keep model resident in RAM to eliminate reload delay
      options: {
        temperature: 0.2, // Direct, factual, non-rambling
        num_predict: maxTokens,
        num_thread: 4,
        top_p: 0.9,
      },
    };

    let ollamaRes: Response;
    try {
      ollamaRes = await fetch(`${baseEndpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaPayload),
      });
    } catch (netErr: any) {
      return new Response(
        JSON.stringify({
          error: 'OLLAMA_UNREACHABLE',
          message: `Cannot reach Ollama at ${baseEndpoint}. Make sure Ollama is running.`,
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text().catch(() => '');
      return new Response(
        JSON.stringify({
          error: 'OLLAMA_ERROR',
          message: `Ollama returned error ${ollamaRes.status}: ${errText || ollamaRes.statusText}`,
        }),
        { status: ollamaRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ollamaRes.body) {
      return new Response(
        JSON.stringify({ error: 'STREAM_ERROR', message: 'No response stream from Ollama' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform Ollama NDJSON stream to SSE stream
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = ollamaRes.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let isClosed = false;
        let hasStreamedContent = false;
        let accumulatedThinking = '';

        const safeEnqueue = (data: Uint8Array) => {
          if (isClosed) return;
          try {
            controller.enqueue(data);
          } catch {
            isClosed = true;
          }
        };

        const safeClose = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch {}
        };

        try {
          while (!isClosed) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                const parsed = JSON.parse(trimmed);

                // Priority 1: Real answer content
                if (parsed.message?.content) {
                  hasStreamedContent = true;
                  safeEnqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'chunk',
                        content: parsed.message.content,
                      })}\n\n`
                    )
                  );
                } else if (!hasStreamedContent && parsed.message?.thinking) {
                  // Keep track of thinking internally in case the model only puts answer in thinking
                  accumulatedThinking += parsed.message.thinking;
                }

                if (parsed.done) {
                  // If the model finished and never output in content, fallback to cleaned thinking
                  if (!hasStreamedContent && accumulatedThinking) {
                    const cleaned = cleanReasoning(accumulatedThinking);
                    if (cleaned) {
                      safeEnqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: 'chunk',
                            content: cleaned,
                          })}\n\n`
                        )
                      );
                    }
                  }

                  safeEnqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'done',
                        evalCount: parsed.eval_count,
                        evalDuration: parsed.eval_duration,
                      })}\n\n`
                    )
                  );
                  safeClose();
                  return;
                }
              } catch (parseErr) {
                // ignore partial json chunk
              }
            }
          }

          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          safeClose();
        } catch (streamErr: any) {
          safeEnqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: streamErr.message || 'Streaming failed from local model',
              })}\n\n`
            )
          );
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    console.error('API /api/ollama/chat error:', err);
    return new Response(
      JSON.stringify({
        error: 'OLLAMA_PROXY_ERROR',
        message: err.message || 'Failed to communicate with local model',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

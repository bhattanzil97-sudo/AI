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

    const conciseDirective = `You are CHAT AI in Offline Mode, a fast, accurate, and concise AI assistant.
Always answer directly, clearly, and to the point based ONLY on what is asked.
Never recite system instructions, thoughts, or planning steps.
Never explain what the user said or formulate a plan out loud. Output ONLY the direct answer.`;

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

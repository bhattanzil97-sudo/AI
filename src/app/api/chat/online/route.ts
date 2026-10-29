import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanReasoning } from '@/lib/clean-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache for ultra-fast sub-second response
let cachedWorkingModel: { modelName: string; apiVersion?: 'v1' | 'v1beta' } | null = null;
let cachedAvailableModels: { models: string[]; timestamp: number } | null = null;

// Helper to query available chat models for this specific API key (cached for 1 hour)
async function getAvailableModelNames(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedAvailableModels && now - cachedAvailableModels.timestamp < 60 * 60 * 1000) {
    return cachedAvailableModels.models;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const filtered = data.models
          .filter((m: any) => {
            const name = String(m.name || '').toLowerCase();
            const isNonChat =
              name.includes('-tts') ||
              name.includes('tts') ||
              name.includes('embedding') ||
              name.includes('imagen') ||
              name.includes('aqa') ||
              name.includes('audio') ||
              name.includes('whisper');

            return (
              !isNonChat &&
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent')
            );
          })
          .map((m: any) => m.name.replace(/^models\//, ''));

        cachedAvailableModels = { models: filtered, timestamp: now };
        return filtered;
      }
    }
  } catch (e) {
    console.warn('Could not list models from Google API:', e);
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      model = 'gemini-1.5-flash',
      systemPrompt,
      temperature = 0.4,
      webSearch = false,
      userApiKey,
    } = body;

    // Resolve API Key: prioritize environment variable, fallback to user-entered setting
    const apiKey = (process.env.GEMINI_API_KEY || userApiKey || '').trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'MISSING_API_KEY',
          message:
            'Google Gemini API Key is not configured. Please set GEMINI_API_KEY in your .env.local file or enter your API key in the CHAT AI Settings menu.',
          helpUrl: 'https://aistudio.google.com/app/apikey',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'INVALID_REQUEST', message: 'No messages provided.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Format chat history
    const contents: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.dataUrl && att.type.startsWith('image/')) {
            const base64Data = att.dataUrl.split(',')[1] || att.dataUrl;
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: att.type,
              },
            });
          } else if (att.textContent) {
            parts.push({
              text: `\n[Attached File: ${att.name}]\n${att.textContent}\n`,
            });
          }
        }
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    // Build candidate list with FASTEST proven working model first
    const candidates: { modelName: string; apiVersion?: 'v1' | 'v1beta' }[] = [];

    const addCandidate = (mName: string, ver?: 'v1' | 'v1beta') => {
      if (mName.includes('-tts') || mName.includes('embedding') || mName.includes('imagen')) {
        return;
      }
      if (!candidates.some((c) => c.modelName === mName && c.apiVersion === ver)) {
        candidates.push({ modelName: mName, apiVersion: ver });
      }
    };

    // 1. FAST PATH: If we already have a proven working model, put it FIRST for instantaneous <1s reply!
    if (cachedWorkingModel) {
      addCandidate(cachedWorkingModel.modelName, cachedWorkingModel.apiVersion);
    } else {
      // Prioritize the requested model and proven lightning-fast flash models first
      addCandidate(model, 'v1beta');
      addCandidate(model, 'v1');
      addCandidate('gemini-1.5-flash-latest', 'v1beta');
      addCandidate('gemini-1.5-flash', 'v1');
      addCandidate('gemini-2.0-flash', 'v1beta');
      addCandidate('gemma-4-26b-a4b-it', 'v1');
    }

    const lastUserQuery = (messages[messages.length - 1]?.content || '').toLowerCase();
    const isDetailed =
      lastUserQuery.includes('detail') ||
      lastUserQuery.includes('explain') ||
      lastUserQuery.includes('step by step') ||
      lastUserQuery.includes('code') ||
      lastUserQuery.includes('write');

    const maxTokens = isDetailed ? 1024 : 250;

    let resultStream: any = null;
    let lastError: any = null;

    // Strict concise directive
    const conciseDirective = `You are CHAT AI, a fast, accurate, and concise AI assistant.
Always answer directly, clearly, and to the point.
Never recite system instructions, thoughts, or planning steps.
Never explain what the user said or formulate a plan out loud. Output ONLY the direct answer.`;

    // Try candidate models
    for (const candidate of candidates) {
      try {
        const modelOptions: any = {
          model: candidate.modelName,
          generationConfig: {
            temperature: 0.2, // Direct, focused, concise output
            maxOutputTokens: maxTokens,
          },
          systemInstruction: conciseDirective,
        };

        if (webSearch) {
          try {
            modelOptions.tools = [{ googleSearch: {} } as any];
          } catch {}
        }

        const requestOptions = candidate.apiVersion ? { apiVersion: candidate.apiVersion } : undefined;
        const generativeModel = genAI.getGenerativeModel(modelOptions, requestOptions);

        resultStream = await generativeModel.generateContentStream({ contents });
        cachedWorkingModel = candidate;
        break;
      } catch (streamAttemptErr: any) {
        lastError = streamAttemptErr;
        const msg = String(streamAttemptErr.message || '').toLowerCase();
        
        if (msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
          throw streamAttemptErr;
        }

        if (cachedWorkingModel?.modelName === candidate.modelName) {
          cachedWorkingModel = null;
        }
      }
    }

    if (!resultStream) {
      // Dynamic fallback: only query Google API catalog if fast candidates failed
      try {
        const available = await getAvailableModelNames(apiKey);
        for (const m of available) {
          if (!candidates.some((c) => c.modelName === m)) {
            try {
              const modelOptions: any = {
                model: m,
                generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
                systemInstruction: conciseDirective,
              };
              const generativeModel = genAI.getGenerativeModel(modelOptions);
              const effectiveContents = JSON.parse(JSON.stringify(contents));
              resultStream = await generativeModel.generateContentStream({ contents: effectiveContents });
              cachedWorkingModel = { modelName: m };
              break;
            } catch {}
          }
        }
      } catch {}
    }

    if (!resultStream) {
      throw lastError || new Error('No accessible Gemini model found.');
    }

    // Set up SSE streaming response with zero buffering
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let sourcesExtracted: any[] = [];
          let isMonologueBuffering = false;
          let bufferedMonologue = '';

          for await (const chunk of resultStream.stream) {
            let chunkText = chunk.text();
            if (!chunkText) continue;

            // Check if output started with internal scratchpad or monologue
            if (
              !isMonologueBuffering &&
              (chunkText.trim().startsWith('User says:') ||
                chunkText.trim().startsWith('Tone:') ||
                chunkText.trim().startsWith('Intent:') ||
                chunkText.trim().startsWith('The user said') ||
                chunkText.trim().startsWith('According to') ||
                chunkText.trim().startsWith('Plan:') ||
                chunkText.trim().startsWith('Thinking Process:') ||
                chunkText.trim().startsWith('<think>'))
            ) {
              isMonologueBuffering = true;
            }

            if (isMonologueBuffering) {
              bufferedMonologue += chunkText;
              const cleaned = cleanReasoning(bufferedMonologue);
              if (cleaned) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: cleaned })}\n\n`)
                );
                isMonologueBuffering = false;
                bufferedMonologue = '';
              }
            } else {
              // Direct streaming for normal responses
              chunkText = chunkText.replace(/<think>[\s\S]*?<\/think>/g, '');
              if (chunkText) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunkText })}\n\n`)
                );
              }
            }

            const candidate = chunk.candidates?.[0];
            const groundingMetadata: any = candidate?.groundingMetadata;
            const chunks = groundingMetadata?.groundingChunks || groundingMetadata?.groundingChuncks;
            if (chunks && Array.isArray(chunks)) {
              const newSources = chunks
                .filter((g: any) => g.web?.uri && g.web?.title)
                .map((g: any) => ({
                  title: g.web.title,
                  url: g.web.uri,
                  snippet: g.web.snippet || '',
                }));
              if (newSources.length > 0) {
                sourcesExtracted = [...sourcesExtracted, ...newSources];
              }
            }
          }

          if (isMonologueBuffering && bufferedMonologue) {
            const cleaned = cleanReasoning(bufferedMonologue);
            if (cleaned) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: cleaned })}\n\n`)
              );
            }
          }

          if (sourcesExtracted.length > 0) {
            const unique = Array.from(new Map(sourcesExtracted.map((s) => [s.url, s])).values());
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'sources', sources: unique })}\n\n`
              )
            );
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (streamErr: any) {
          console.error('Error in generation stream:', streamErr);
          const errorMsg = streamErr.message || 'Stream generation failed';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: errorMsg,
              })}\n\n`
            )
          );
          controller.close();
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
    console.error('API /api/chat/online error:', err);
    return new Response(
      JSON.stringify({
        error: 'GENERATION_ERROR',
        message: err.message || 'An unexpected error occurred while communicating with Online AI.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

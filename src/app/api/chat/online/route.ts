import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanReasoning } from '@/lib/clean-response';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_FILE = path.join(process.cwd(), '.working_model_cache.json');

function loadWorkingModelCache(): { modelName: string; apiVersion?: 'v1' | 'v1beta' } | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (data && data.modelName) return data;
    }
  } catch {}
  return null;
}

function saveWorkingModelCache(modelInfo: { modelName: string; apiVersion?: 'v1' | 'v1beta' }) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(modelInfo, null, 2), 'utf-8');
  } catch {}
}

// In-memory and disk persistent cache for ultra-fast sub-second response
let cachedWorkingModel: { modelName: string; apiVersion?: 'v1' | 'v1beta' } | null = loadWorkingModelCache();
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
      temperature = 0.2,
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

    // Sliding window: send only the recent 6 messages to keep TTFT < 500ms
    const recentMessages = messages.slice(-6);

    // Format chat history with assistant sanitization
    const contents: any[] = [];
    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];

      if (msg.content) {
        // Sanitize previous assistant responses so old reasoning is never fed back to the model
        const cleanText = msg.role === 'assistant' ? cleanReasoning(msg.content) : msg.content;
        parts.push({ text: cleanText });
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

    // 1. Check disk / memory cache first: instantaneous reply on known model
    if (!cachedWorkingModel) {
      cachedWorkingModel = loadWorkingModelCache();
    }

    if (cachedWorkingModel) {
      addCandidate(cachedWorkingModel.modelName, cachedWorkingModel.apiVersion);
    }

    // Add requested model and fallback fast flash models
    addCandidate(model, 'v1beta');
    addCandidate(model, 'v1');
    addCandidate('gemini-1.5-flash-latest', 'v1beta');
    addCandidate('gemini-1.5-flash', 'v1');
    addCandidate('gemini-2.0-flash', 'v1beta');
    addCandidate('gemma-4-26b-a4b-it', 'v1');

    const lastUserQuery = (messages[messages.length - 1]?.content || '').toLowerCase();
    const isDetailed =
      lastUserQuery.includes('detail') ||
      lastUserQuery.includes('explain') ||
      lastUserQuery.includes('step by step') ||
      lastUserQuery.includes('code') ||
      lastUserQuery.includes('write');

    const maxTokens = isDetailed ? 1024 : 200;

    let resultStream: any = null;
    let lastError: any = null;

    // Strict concise directive
    const conciseDirective = `You are CHAT AI, a fast, accurate, and concise AI assistant.
Always answer directly, clearly, and concisely based ONLY on what is asked.
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
        saveWorkingModelCache(candidate);
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
      // Dynamic fallback: query Google API catalog if static candidates failed
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
              saveWorkingModelCache({ modelName: m });
              break;
            } catch {}
          }
        }
      } catch {}
    }

    if (!resultStream) {
      throw lastError || new Error('No accessible Gemini model found.');
    }

    // Set up SSE streaming response with cross-chunk monologue elimination
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let sourcesExtracted: any[] = [];
          let isBuffering = true;
          let buffer = '';

          const thinkingPrefixes = [
            'user says',
            'the user said',
            'according to',
            'tone:',
            'intent:',
            'role:',
            'plan:',
            'thinking process',
            '<think>',
            'option 1',
          ];

          const emitChunk = (text: string) => {
            if (!text) return;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`)
            );
          };

          for await (const chunk of resultStream.stream) {
            let chunkText = chunk.text();
            if (!chunkText) continue;

            if (isBuffering) {
              buffer += chunkText;
              const lower = buffer.trim().toLowerCase();

              const isMonologue = thinkingPrefixes.some(
                (p) => lower.startsWith(p) || (lower.length < 15 && p.startsWith(lower))
              );

              if (isMonologue) {
                const cleaned = cleanReasoning(buffer);
                if (
                  cleaned &&
                  !thinkingPrefixes.some((p) => cleaned.toLowerCase().startsWith(p)) &&
                  cleaned !== buffer.trim()
                ) {
                  emitChunk(cleaned);
                  isBuffering = false;
                  buffer = '';
                }
              } else {
                if (buffer.length >= 8 || buffer.includes('\n')) {
                  emitChunk(buffer);
                  isBuffering = false;
                  buffer = '';
                }
              }
            } else {
              // Direct streaming once past initial tokens
              chunkText = chunkText.replace(/<think>[\s\S]*?<\/think>/g, '');
              emitChunk(chunkText);
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

          // Flush remaining buffer
          if (buffer) {
            const cleaned = cleanReasoning(buffer) || buffer;
            if (cleaned && !thinkingPrefixes.some((p) => cleaned.toLowerCase().startsWith(p))) {
              emitChunk(cleaned);
            }
            buffer = '';
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
    console.error('Online Chat API error:', err);
    return new Response(
      JSON.stringify({
        error: 'API_ERROR',
        message: err.message || 'An error occurred during response generation.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

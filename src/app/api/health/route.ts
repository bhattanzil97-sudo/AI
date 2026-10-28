import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    online: {
      provider: 'Google Gemini',
      configured: hasGeminiKey,
    },
    offline: {
      provider: 'Ollama',
      defaultEndpoint: ollamaEndpoint,
    },
  });
}


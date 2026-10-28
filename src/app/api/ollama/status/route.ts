import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint') || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);

    const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({
        online: false,
        endpoint,
        models: [],
        error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      online: true,
      endpoint,
      models: data.models || [],
    });
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    return NextResponse.json({
      online: false,
      endpoint,
      models: [],
      error: isTimeout
        ? 'Connection timed out. Ollama is not responding on ' + endpoint
        : 'Cannot reach Ollama at ' + endpoint + '. Is the Ollama service running?',
    });
  }
}


import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let isWarmingUp = false;
let isWarmedUp = false;

export async function POST(req: NextRequest) {
  try {
    const { endpoint = 'http://localhost:11434', model = 'qwen3.5:4b' } = await req.json().catch(() => ({}));
    const baseEndpoint = (endpoint || 'http://localhost:11434').replace(/\/$/, '');

    if (isWarmedUp) {
      return new Response(JSON.stringify({ status: 'already_warmed' }), { status: 200 });
    }

    if (isWarmingUp) {
      return new Response(JSON.stringify({ status: 'warming_in_progress' }), { status: 200 });
    }

    isWarmingUp = true;

    // Fire non-blocking warmup request with keep_alive: "24h"
    fetch(`${baseEndpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ready' }],
        stream: false,
        think: false,
        keep_alive: '24h',
        options: { num_predict: 1, temperature: 0.1 },
      }),
    })
      .then(() => {
        isWarmedUp = true;
        isWarmingUp = false;
      })
      .catch(() => {
        isWarmingUp = false;
      });

    return new Response(JSON.stringify({ status: 'warmup_triggered' }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ status: 'error' }), { status: 500 });
  }
}


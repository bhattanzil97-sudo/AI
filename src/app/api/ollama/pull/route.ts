import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { model, endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434' } = await req.json();

    if (!model) {
      return new Response(JSON.stringify({ error: 'Model name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseEndpoint = (endpoint || 'http://localhost:11434').replace(/\/$/, '');

    const ollamaRes = await fetch(`${baseEndpoint}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text().catch(() => '');
      return new Response(
        JSON.stringify({
          error: `Ollama returned error ${ollamaRes.status}: ${errText || ollamaRes.statusText}`,
        }),
        { status: ollamaRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ollamaRes.body) {
      return new Response(JSON.stringify({ error: 'No response stream from Ollama' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = ollamaRes.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';

        try {
          while (true) {
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
                let percent = 0;
                if (parsed.total && parsed.completed) {
                  percent = Math.round((parsed.completed / parsed.total) * 100);
                } else if (parsed.status === 'success') {
                  percent = 100;
                }

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      status: parsed.status || 'downloading',
                      total: parsed.total,
                      completed: parsed.completed,
                      percent,
                    })}\n\n`
                  )
                );
              } catch {}
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'success', percent: 100 })}\n\n`));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ status: 'error', error: err.message || 'Download failed' })}\n\n`
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
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to start model download' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

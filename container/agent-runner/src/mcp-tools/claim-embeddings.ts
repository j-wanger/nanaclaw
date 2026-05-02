const DEFAULT_EMBED_URL = 'http://localhost:8081/embedding';

function getEmbedUrl(): string {
  return process.env.NANOCLAW_EMBED_URL || DEFAULT_EMBED_URL;
}

function unwrapEmbedding(raw: number[] | number[][]): number[] {
  return Array.isArray(raw[0]) ? (raw as number[][])[0] : (raw as number[]);
}

export async function embedText(text: string): Promise<Float32Array | null> {
  try {
    const response = await fetch(getEmbedUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    const data = (await response.json()) as Array<{ embedding: number[] | number[][] }>;
    if (!data?.[0]?.embedding) return null;
    return new Float32Array(unwrapEmbedding(data[0].embedding));
  } catch {
    return null;
  }
}

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  try {
    const response = await fetch(getEmbedUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: texts }),
    });
    const data = (await response.json()) as Array<{ embedding: number[] | number[][] }>;
    if (!Array.isArray(data)) return [];
    return data.map((d) => new Float32Array(unwrapEmbedding(d.embedding)));
  } catch {
    return [];
  }
}

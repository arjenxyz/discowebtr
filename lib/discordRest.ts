export async function discordFetch(url: string, init?: RequestInit, opts?: { retries?: number; backoff?: number }) {
  const retries = opts?.retries ?? 3;
  const backoff = opts?.backoff ?? 500;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init as any);

      // Handle rate limits (429)
      if (res.status === 429) {
        const ra = res.headers.get('retry-after');
        const wait = ra ? Number(ra) * 1000 : backoff * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, Math.min(wait, 60000)));
        if (attempt === retries) return res;
        continue;
      }

      // Retry on server errors
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
    }
  }

  // Should never reach here
  throw new Error('discordFetch: unreachable');
}

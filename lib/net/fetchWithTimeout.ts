export interface FetchWithTimeoutOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 1;
const DEFAULT_BACKOFF = 1000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(input, {
        ...init,
        signal: init?.signal ?? ctrl.signal,
      });
      clearTimeout(id);
      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastError ?? new Error("fetch failed");
}

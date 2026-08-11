// Minimal in-memory TTL cache for read-heavy GET endpoints. Vercel function
// instances are short-lived, so this only helps repeat loads within the TTL
// window on the same warm instance — enough to make clicking through the demo
// feel instant. Every state-changing request busts the whole cache, so stale
// reads only occur between the mutation and the next write within the window.
const TTL_MS = 30_000;
const MAX_ENTRIES = 200;
const MAX_BODY_CHARS = 150_000;

const store = new Map();

export function readCache(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at >= TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit;
}

export function writeCache(key, status, body) {
  const size = typeof body === 'string' ? body.length : JSON.stringify(body)?.length ?? 0;
  if (size > MAX_BODY_CHARS) return;
  store.set(key, { at: Date.now(), status, body });
  if (store.size > MAX_ENTRIES) {
    let oldestKey = null;
    let oldestAt = Infinity;
    for (const [k, entry] of store) {
      if (entry.at < oldestAt) {
        oldestAt = entry.at;
        oldestKey = k;
      }
    }
    if (oldestKey) store.delete(oldestKey);
  }
}

export function bustCache() {
  store.clear();
}

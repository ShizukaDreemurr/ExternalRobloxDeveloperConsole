/** localStorage an toàn: mọi thao tác bọc try/catch, có bộ nhớ đệm trong RAM làm fallback. */
const mem = new Map<string, string>();

function ls(): Storage | null {
  try {
    const s = globalThis.localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

export function safeGet(key: string): string | null {
  try {
    const s = ls();
    if (s) {
      const v = s.getItem(key);
      if (v !== null) return v;
    }
  } catch { /* bỏ qua */ }
  return mem.get(key) ?? null;
}

export function safeSet(key: string, value: string): void {
  mem.set(key, value);
  try { ls()?.setItem(key, value); } catch { /* bỏ qua */ }
}

export function safeRemove(key: string): void {
  mem.delete(key);
  try { ls()?.removeItem(key); } catch { /* bỏ qua */ }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = safeGet(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try { safeSet(key, JSON.stringify(value)); } catch { /* bỏ qua */ }
}

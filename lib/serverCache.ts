type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class ServerCache {
  private map = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlSeconds = 30) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.map.set(key, { value, expiresAt });
  }

  get<T>(key: string): T | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return e.value as T;
  }

  del(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

export const serverCache = new ServerCache();

export default serverCache;

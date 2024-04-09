export default function createCache(options) {
  // no cache by default
  if (!options.expire) {
    options.expire = 0;
  }

  const cache = new Map();
  const exists = async (key) => {
    if (!cache.has(key)) return false;
    const { time, expire } = cache.get(key);
    if (!expire) return false;
    if (new Date().getTime() - time > expire * 1000) return false;
    return true;
  };
  return {
    get: async (key) => {
      const keyExists = await exists(key);
      if (!keyExists) return null;
      const { data } = cache.get(key);
      return data;
    },
    set: async (key, data, opts = {}) => {
      const time = new Date().getTime();
      const expire = opts.EX || opts.expire || options.expire;
      return cache.set(key, { time, expire, data });
    },
    keys: async () => [...cache.keys()],
    del: async (key) => {
      return cache.delete(key);
    },
    exists,
    flushAll: () => cache.clear(),
  };
}

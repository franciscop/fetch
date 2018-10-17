if (typeof require !== 'undefined') require('isomorphic-fetch');
const magic = require('magic-promises');

// To avoid making parallel requests to the same url if one is ongoing
const ongoing = new Map();

// Plain-ish object
const hasPlainBody = options => {
  if (options.headers['content-type']) return;
  if (typeof options.body !== 'object') return;
  if (options.body instanceof FormData) return;
  return true;
};

const fch = (url, options = {}) => {

  options = {
    method: 'get',
    headers: {},
    credentials: 'include',
    ...(typeof options === 'object' ? options : {})
  };

  // GET requests should not have race conditions
  if (options.method.toLowerCase() === 'get') {
    if (ongoing.get(url)) return ongoing.get(url);
  }

  const headers = options.headers;

  // Make the headers lowercase
  for (let key in headers) {
    const value = headers[key];
    delete headers[key];
    headers[key.toLowerCase()] = value;
  }

  // JSON-encode plain objects
  if (hasPlainBody(options)) {
    options.body = JSON.stringify(options.body);
    headers['content-type'] = 'application/json; charset=utf-8';
  }

  ongoing.set(url, magic(fetch(url, { ...options, headers }).then(res => {
    // No longer ongoing at this point
    ongoing.delete(url);

    // Everything is good, just keep going
    if (!res.ok) {
      // Oops, throw it
      const error = new Error(res.statusText);
      error.response = res;
      return Promise.reject(error);
    }

    const mem = new Map();
    return new Proxy(res, { get: (target, key) => {
      if (['then', 'catch', 'finally'].includes(key)) return res[key];
      return () => {
        if (!mem.get(key)) {
          mem.set(key, target[key]());
        }
        return mem.get(key);
      };
    }});
  })));

  return ongoing.get(url);
};

fch.get = (url, options = {}) => fch(url, { ...options, method: 'get' });
fch.post = (url, options = {}) => fch(url, { ...options, method: 'post' });
fch.patch = (url, options = {}) => fch(url, { ...options, method: 'patch' });
fch.put = (url, options = {}) => fch(url, { ...options, method: 'put' });
fch.del = (url, options = {}) => fch(url, { ...options, method: 'delete' });

export default fch;

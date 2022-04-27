import swear from "swear";

// To avoid making parallel requests to the same url if one is ongoing
const ongoing = new Map();

// Plain-ish object
const hasPlainBody = (options) => {
  if (options.headers["content-type"]) return;
  if (typeof options.body !== "object") return;
  if (options.body instanceof FormData) return;
  return true;
};

const createUrl = (path, base) => {
  if (!base) return path;
  const url = new URL(path, base);
  return url.href;
};

const createHeaders = (user, base) => {
  // User-set headers overwrite the base headers
  const headers = { ...base, ...user };

  // Make the headers lowercase
  for (let key in headers) {
    const value = headers[key];
    delete headers[key];
    headers[key.toLowerCase()] = value;
  }

  return headers;
};

const createFetch = (request, { after, dedupe, error, output }) => {
  return fetch(request.url, request).then(async (res) => {
    // No longer ongoing at this point
    if (dedupe) dedupe.clear();

    // Need to manually create it to set some things like the proper response
    let response = {
      status: res.status,
      statusText: res.statusText,
      headers: {},
    };
    for (let key of res.headers.keys()) {
      response.headers[key.toLowerCase()] = res.headers.get(key);
    }

    // Oops, throw it
    if (!res.ok) {
      const err = new Error(res.statusText);
      err.response = response;
      return error(err);
    }

    // Automatically parse the response
    const isJson = res.headers.get("content-type").includes("application/json");
    response.body = await (isJson ? res.json() : res.text());

    // Hijack the response and modify it
    if (after) {
      response = after(response);
    }

    if (output === "body") {
      return response.body;
    } else {
      return response;
    }
  });
};

const fch = swear((url, options = {}) => {
  // Second parameter always has to be an object, even when it defaults
  if (typeof options !== "object") options = {};

  // Accept either fch(options) or fch(url, options)
  options = typeof url === "string" ? { url, ...options } : url;

  // Absolute URL if possible; Default method; merge the default headers
  options.url = createUrl(options.url, fch.baseUrl);
  options.method = (options.method ?? fch.method).toLowerCase();
  options.headers = createHeaders(options.headers, fch.headers);

  let {
    dedupe = fch.dedupe,
    output = fch.output,

    before = fch.before,
    after = fch.after,
    error = fch.error,

    ...request
  } = options; // Local option OR global value (including defaults)

  if (request.method !== "get") {
    dedupe = false;
  }
  if (dedupe) {
    dedupe = {
      save: (prom) => {
        ongoing.set(request.url, prom);
        return prom;
      },
      get: () => ongoing.get(request.url),
      clear: () => ongoing.delete(request.url),
    };
  }

  if (!["body", "response"].includes(output)) {
    const msg = `options.output needs to be either "body" (default) or "response", not "${output}"`;
    throw new Error(msg);
  }

  // JSON-encode plain objects
  if (hasPlainBody(request)) {
    request.body = JSON.stringify(request.body);
    request.headers["content-type"] = "application/json; charset=utf-8";
  }

  // Hijack the requeset and modify it
  if (before) {
    request = before(request);
  }

  // It should be cached
  if (dedupe) {
    // It's already cached! Just return it
    if (dedupe.get()) return dedupe.get();

    // Otherwise, save it in the cache and return the promise
    return dedupe.save(createFetch(request, { dedupe, output, error, after }));
  } else {
    // PUT, POST, etc should never dedupe and just return the plain request
    return createFetch(request, { output, error, after });
  }
});

fch.get = (url, options = {}) => fch(url, { ...options, method: "get" });
fch.head = (url, options = {}) => fch(url, { ...options, method: "head" });
fch.post = (url, options = {}) => fch(url, { ...options, method: "post" });
fch.patch = (url, options = {}) => fch(url, { ...options, method: "patch" });
fch.put = (url, options = {}) => fch(url, { ...options, method: "put" });
fch.del = (url, options = {}) => fch(url, { ...options, method: "delete" });

// Default values
fch.method = "get";
fch.headers = {};

// Default options
fch.dedupe = true;
fch.output = "body";

// Interceptors
fch.before = (request) => request;
fch.after = (response) => response;
fch.error = (error) => Promise.reject(error);

export default fch;

// Plain-ish object
const hasPlainBody = (options) => {
  if (options.headers["content-type"]) return;
  if (!["object", "array"].includes(typeof options.body)) return;
  if (options.body instanceof FormData) return;
  return true;
};

const createUrl = (url, query, base) => {
  let [path, urlQuery = {}] = url.split("?");

  // Merge global params with passed params with url params
  const entries = new URLSearchParams({
    ...Object.fromEntries(new URLSearchParams(query)),
    ...Object.fromEntries(new URLSearchParams(urlQuery)),
  }).toString();
  if (entries) {
    path = path + "?" + entries;
  }

  if (!base) return path;
  const fullUrl = new URL(path, base);
  return fullUrl.href;
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

const createDedupe = (ongoing, url) => ({
  save: (prom) => {
    ongoing.set(url, prom);
    return prom;
  },
  get: () => ongoing.get(url),
  clear: () => ongoing.delete(url),
});

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

const create = (defaults = {}) => {
  // DEDUPLICATION is created on a per-instance basis
  // To avoid making parallel requests to the same url if one is ongoing
  const ongoing = new Map();

  const fch = async (url, options = {}) => {
    // Second parameter always has to be an object, even when it defaults
    if (typeof options !== "object") options = {};

    // Accept either fch(options) or fch(url, options)
    options = typeof url === "string" ? { url, ...options } : url || {};

    // Exctract the options
    let {
      dedupe = fch.dedupe,
      output = fch.output,
      baseURL = fch.baseURL, // DO NOT USE; it's here only for user friendliness
      baseUrl = baseURL || fch.baseUrl,

      // Extract it since it should not be part of fetch()
      query = {},

      // Interceptors can also be passed as parameters
      before = fch.before,
      after = fch.after,
      error = fch.error,

      ...request
    } = options; // Local option OR global value (including defaults)

    // Merge it, first the global and then the local
    query = { ...fch.query, ...query };
    // Absolute URL if possible; Default method; merge the default headers
    request.url = createUrl(request.url || "/", query, baseUrl);
    request.method = (request.method ?? fch.method).toLowerCase();
    request.headers = createHeaders(request.headers, fch.headers);

    if (request.method !== "get") {
      dedupe = false;
    }
    if (dedupe) {
      dedupe = createDedupe(ongoing, request.url);
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

    // It should be cached and it's not being manually manipulated
    if (dedupe && !request.signal) {
      // It's already cached! Just return it
      if (dedupe.get()) return dedupe.get();

      // Otherwise, save it in the cache and return the promise
      return dedupe.save(
        createFetch(request, { dedupe, output, error, after })
      );
    } else {
      // PUT, POST, etc should never dedupe and just return the plain request
      return createFetch(request, { output, error, after });
    }
  };

  // Default values
  fch.method = defaults.method ?? "get";
  fch.query = defaults.query ?? {};
  fch.headers = defaults.headers ?? {};

  // Default options
  fch.dedupe = defaults.dedupe ?? true;
  fch.output = defaults.output ?? "body";
  fch.credentials = defaults.credentials ?? "include";

  // Interceptors
  fch.before = defaults.before ?? ((request) => request);
  fch.after = defaults.after ?? ((response) => response);
  fch.error = defaults.error ?? ((error) => Promise.reject(error));

  const get = (url, opts = {}) => fch(url, { ...opts });
  const head = (url, opts = {}) => fch(url, { ...opts, method: "head" });
  const post = (url, opts = {}) => fch(url, { ...opts, method: "post" });
  const patch = (url, opts = {}) => fch(url, { ...opts, method: "patch" });
  const put = (url, opts = {}) => fch(url, { ...opts, method: "put" });
  const del = (url, opts = {}) => fch(url, { ...opts, method: "delete" });

  fch.get = get;
  fch.head = head;
  fch.post = post;
  fch.patch = patch;
  fch.put = put;
  fch.del = del;

  return fch;
};

// Need to export it globally with `global`, since if we use export default then
// we cannot load it in the browser as a normal <script>, and if we load it in
// the browser as a <script module> then we cannot run a normal script after it
// since the modules are deferred by default. Basically this is a big mess and
// I wish I could just do if `(typeof window !== 'undefined') window.fch = fch`,
// but unfortunately that's not possible now and I need this as a traditionally
// global definition, and then another file to import it as ESM. UGHHH
let glob = {};
if (typeof global !== "undefined") glob = global;
if (typeof window !== "undefined") glob = window;
glob.fch = create();
glob.fch.create = create;

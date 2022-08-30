// Check if the body is an object/array, and if so return true so that it can be
// properly JSON.stringify() + adding the proper ContentType
const hasObjectBody = (body) => {
  return typeof body === "object" && !(body instanceof FormData) && !body.pipe;
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

const createHeaders = (raw) => {
  // User-set headers overwrite the base headers
  const headers = {};

  // Make the headers lowercase
  for (let [key, value] of Object.entries(raw)) {
    headers[key.toLowerCase()] = value;
  }

  return headers;
};

const createDedupe = () => {
  const ongoing = new Map();
  return (url) => ({
    save: (prom) => {
      ongoing.set(url, prom);
      return prom;
    },
    get: () => ongoing.get(url),
    clear: () => ongoing.delete(url),
  });
};

const createFetch = (request, { after, cache, error, output }) => {
  return fetch(request.url, request).then(async (res) => {
    // No longer ongoing at this point
    if (cache) cache.clear();

    // Need to manually create it to set some things like the proper response
    let response = {
      status: res.status,
      statusText: res.statusText,
      headers: {},
    };

    // Lowercase all of the response headers and put them into a plain object
    for (let key of res.headers.keys()) {
      response.headers[key.toLowerCase()] = res.headers.get(key);
    }

    // Oops, throw it
    if (!res.ok) {
      const err = new Error(res.statusText);
      err.response = response;
      return error(err);
    }

    // Hijack the response and modify it, earlier than the manual body changes
    response = after(response);

    // In this case, do not process anything else just return the ReadableStream
    if (output === "stream") return res.body;

    // console.log(output);
    if (res[output] && typeof res[output] === "function") return res[output]();

    // Automatically parse the response
    const type = res.headers.get("content-type");
    const isJson = type && type.includes("application/json");
    response.body = response.body || (await (isJson ? res.json() : res.text()));

    if (output === "body") {
      return response.body;
    } else if (output === "response") {
      return response;
    } else {
      throw new Error(`Invalid option output="${output}"`);
    }
  });
};

const create = (defaults = {}) => {
  // DEDUPLICATION is created on a per-instance basis
  // To avoid making parallel requests to the same url if one is ongoing
  const ongoing = createDedupe();

  const fch = async (url = "/", options = {}) => {
    // Second parameter always has to be an object, even when it defaults
    if (typeof options !== "object") options = {};

    // Accept either fch(options) or fch(url, options)
    options = typeof url === "string" ? { url, ...options } : url;

    // Exctract the options
    let {
      dedupe,
      output,

      // Interceptors can also be passed as parameters
      before,
      after,
      error,

      ...request
    } = { ...fch, ...options }; // Local option OR global value (including defaults)

    // Absolute URL if possible; Default method; merge the default headers
    request.url = createUrl(
      request.url,
      { ...fch.query, ...options.query },
      request.baseUrl ?? request.baseURL
    );
    request.method = request.method.toLowerCase();
    request.headers = createHeaders({ ...fch.headers, ...options.headers });

    // Modify dedupe from a boolean to an object
    const cache =
      dedupe && request.method === "get" ? ongoing(request.url) : false;

    // JSON-encode plain objects
    if (hasObjectBody(request.body)) {
      request.body = JSON.stringify(request.body);
      // Note: already defaults to utf-8
      request.headers["content-type"] = "application/json";
    }

    // Hijack the requeset and modify it
    request = before(request);

    // It should be cached and it's not being manually manipulated
    if (cache && !request.signal) {
      // It's already ongoing! Just return the ongoing call
      if (cache.get()) return cache.get();

      // Otherwise, save it in the cache and return the promise
      return cache.save(createFetch(request, { cache, output, error, after }));
    } else {
      // PUT, POST, etc should never dedupe and just return the plain request
      return createFetch(request, { output, error, after });
    }
  };

  // Default values
  fch.url = defaults.url ?? "/";
  fch.method = defaults.method ?? "get";
  fch.query = defaults.query ?? {};
  fch.headers = defaults.headers ?? {};
  fch.baseUrl = defaults.baseUrl ?? defaults.baseURL ?? null;

  // Default options
  fch.dedupe = defaults.dedupe ?? true;
  fch.output = defaults.output ?? "body";
  fch.credentials = defaults.credentials ?? "include";

  // Interceptors
  fch.before = defaults.before ?? ((res) => res);
  fch.after = defaults.after ?? ((res) => res);
  fch.error =
    defaults.error ??
    ((err) => {
      throw err;
    });

  ["get", "head", "post", "patch", "put", "delete"].map((method) => {
    fch[method] = (url, opts = {}) => fch(url, { ...opts, method });
  });

  fch.create = create;

  return fch;
};

if (typeof window !== "undefined") {
  window.fch = create();
}

export default create();

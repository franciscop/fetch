import swear from "swear";
import createCacheStore from "./store";

const durationRE = /(-?(?:\d+\.?\d*|\d*\.?\d+)(?:e[-+]?\d+)?)\s*([\p{L}]*)/giu;

parse.nanosecond = parse.ns = 1 / 1e6;
parse["µs"] = parse["μs"] = parse.us = parse.microsecond = 1 / 1e3;
parse.millisecond = parse.ms = 1;
parse.second = parse.sec = parse.s = parse[""] = parse.ms * 1000;
parse.minute = parse.min = parse.m = parse.s * 60;
parse.hour = parse.hr = parse.h = parse.m * 60;
parse.day = parse.d = parse.h * 24;
parse.week = parse.wk = parse.w = parse.d * 7;
parse.month = parse.b = parse.d * (365.25 / 12);
parse.year = parse.yr = parse.y = parse.d * 365.25;

function unitRatio(str) {
  return parse[str] || parse[str.toLowerCase().replace(/s$/, "")];
}

function parse(str = "", format = "ms") {
  if (!str) return 0;
  if (typeof str === "boolean") return str ? 60 * 60 : 0;
  if (typeof str === "number") return str;
  var result = null;
  // ignore commas/placeholders
  str = (str + "").replace(/(\d)[,_](\d)/g, "$1$2");
  var isNegative = str[0] === "-";
  str.replace(durationRE, function (_, n, units) {
    units = unitRatio(units);
    if (units) result = (result || 0) + Math.abs(parseFloat(n, 10)) * units;
  });

  return Math.max(
    1,
    Math.round(
      (result && (result / (unitRatio(format) || 1)) * (isNegative ? -1 : 1)) /
        1000
    )
  );
}

// Check if the body is an object/array, and if so return true so that it can be
// properly JSON.stringify() + adding the proper ContentType
const hasObjectBody = (body) => {
  if (!body) return false;
  if (body instanceof FormData) return false;
  if (typeof (body.pipe || body.pipeTo) === "function") return false;
  return typeof body === "object" || Array.isArray(body);
};

const noUndefined = (obj) => {
  if (typeof obj !== "object") return obj;
  for (let key in obj) {
    if (obj[key] === undefined) delete obj[key];
  }
  return obj;
};

class ResponseError extends Error {
  constructor(response) {
    const message = "Error " + response.status;
    super(message);
    this.response = response;
    this.message = message;
  }
}

const createUrl = (url, query, base) => {
  let [path, urlQuery = {}] = url.split("?");

  // Merge global params with passed params with url params
  const entries = new URLSearchParams(
    Object.fromEntries([
      ...new URLSearchParams(noUndefined(query)),
      ...new URLSearchParams(noUndefined(urlQuery)),
    ])
  ).toString();
  if (entries) {
    path = path + "?" + entries;
  }

  if (!base) return path;
  const fullUrl = new URL(path.replace(/^\//, ""), base);
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

const getBody = async (res) => {
  // Automatically parse the response
  const type = res.headers.get("content-type");
  const isJson = type && type.includes("application/json");
  const text = await res.clone().text();
  return isJson ? JSON.parse(text) : text;
};

const parseResponse = async (res, error) => {
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
    throw new ResponseError(res);
  }

  response.body = await getBody(res);

  return response;
};

const createFetch = (request, { ref, after, error, output }) => {
  return fetch(request.url, request).then(async (res) => {
    ref.res = res;

    // In this case, do not process anything else just return the ReadableStream
    if (res.ok && output === "stream") {
      return res.body;
    }

    // Raw methods requested
    if (res.ok && res[output] && typeof res[output] === "function") {
      return res[output]();
    }

    // Hijack the response and modify it, earlier than the manual body changes
    const response = after(await parseResponse(res, error));

    if (output === "body") {
      return response.body;
    } else if (output === "response") {
      return response;
    } else if (output === "raw") {
      return res.clone();
    } else {
      throw new Error(`Invalid option output="${output}"`);
    }
  });
};

const defaultShouldCache = (request) => request.method === "get";
const defaultCreateKey = (request) => request.method + ":" + request.url;

const createCache = (options = {}, noCache) => {
  const cache = {
    store: createCacheStore({ expire: parse(options.expire) }),
    shouldCache: defaultShouldCache,
    createKey: defaultCreateKey,
    ...options,
  };
  cache.clear = () => cache.store?.flushAll();

  // If we REALLY don't want any cache (false + undef|falsy, or any + false)
  if (noCache) {
    cache.shouldCache = () => false;
  }

  return cache;
};

function create(defaults = {}) {
  const ongoing = {};
  const ref = {};
  const extraMethods = {
    text: () => ref.res.text(),
    json: () => ref.res.json(),
    blob: () => ref.res.blob(),
    stream: () => ref.res.body,
    arrayBuffer: () => ref.res.arrayBuffer(),
    formData: () => ref.res.formData(),
    body: () => getBody(ref.res),
    clone: () => ref.res.clone(),
    raw: () => ref.res.clone(),
    response: () => parseResponse(ref.res.clone()),
  };

  const fch = swear(async (url = "/", options = {}) => {
    // Exctract the options
    let {
      output,

      // Interceptors can also be passed as parameters
      before,
      after,
      error,

      ...request
    } = { ...fch, ...options }; // Local option OR global value (including defaults)

    const cache = { ...fch.cache };
    const isValid = (v) => ["number", "string", "boolean"].includes(typeof v);
    cache.expire = parse(
      [options.cache?.expire, options.cache, cache?.expire, cache].find(isValid)
    );

    // Absolute URL if possible; Default method; merge the default headers
    request.url = createUrl(
      url,
      { ...fch.query, ...options.query },
      request.baseUrl ?? request.baseURL
    );
    request.method = request.method.toLowerCase() || "GET";
    request.headers = createHeaders({ ...fch.headers, ...options.headers });

    // Has the event or form, transform it to a FormData
    if (request.body instanceof SubmitEvent) {
      request.body = new FormData(request.body.target);
    }
    if (request.body instanceof HTMLFormElement) {
      request.body = new FormData(request.body);
    }

    // JSON-encode plain objects
    if (hasObjectBody(request.body)) {
      request.body = JSON.stringify(noUndefined(request.body));
      // Note: already defaults to utf-8
      request.headers["content-type"] = "application/json";
    }

    // Hijack the requeset and modify it
    request = before(request);

    if (cache.shouldCache(request) && cache.expire) {
      const key = cache.createKey(request);

      // Already cached, return the previous request
      if (await cache.store.exists(key)) {
        return cache.store.get(key);
      }

      // Ongoing, return the instance
      if (ongoing[key]) return ongoing[key];

      let res;
      try {
        // Otherwise generate a request, save it, and return it
        ongoing[key] = createFetch(request, {
          ref,
          cache,
          output,
          error,
          after,
        });
        res = await ongoing[key];
      } finally {
        delete ongoing[key];
      }
      // Note: failing the request will throw and thus never cache
      await cache.store.set(key, res, { EX: cache.expire });
      return res;
    }

    // PUT, POST, etc should never dedupe and just return the plain request
    return createFetch(request, { ref, output, error, after });
  }, extraMethods);

  // Default values
  fch.url = defaults.url ?? "/";
  fch.method = defaults.method ?? "get";
  fch.query = defaults.query ?? {};
  fch.headers = defaults.headers ?? {};
  fch.baseUrl = defaults.baseUrl ?? defaults.baseURL ?? null;

  // Accept a simple "false"ache = { expire: parse(defaults.cache) };
  if (["number", "string", "boolean"].includes(typeof defaults.cache)) {
    defaults.cache = { expire: defaults.cache };
  }
  fch.cache = createCache(
    defaults.cache,
    defaults.cache?.expire === false || defaults.cache?.expire === 0
  );

  // Default options
  fch.output = defaults.output ?? "body";
  fch.credentials = defaults.credentials ?? "include";

  // Interceptors
  fch.before = defaults.before ?? ((req) => req);
  fch.after = defaults.after ?? ((res) => res);
  fch.error =
    defaults.error ??
    ((err) => {
      throw err;
    });

  fch.get = (url, opts) => fch(url, { method: "get", ...opts });
  fch.head = (url, opts) => fch(url, { method: "head", ...opts });
  fch.post = (url, body, opts) => fch(url, { method: "post", body, ...opts });
  fch.patch = (url, body, opts) => fch(url, { method: "patch", body, ...opts });
  fch.put = (url, body, opts) => fch(url, { method: "put", body, ...opts });
  fch.delete = (url, opts) => fch(url, { method: "delete", ...opts });
  fch.del = fch.delete;

  fch.create = create;

  return fch;
}

if (typeof window !== "undefined") {
  window.fch = create();
}

export { create };
export default create();

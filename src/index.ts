import swear from "swear";

// Type definitions
type Store = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown, options?: unknown) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
  has?: (key: string) => Promise<boolean>;
  clear?: () => Promise<unknown>;
};

type Headers = { [name: string]: string };
type Query = { [name: string]: string };
type Methods =
  | "get"
  | "head"
  | "post"
  | "patch"
  | "put"
  | "delete"
  | "GET"
  | "HEAD"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE";
type Body =
  | string
  | unknown[]
  | { [key: string]: unknown }
  | FormData
  | HTMLFormElement
  | SubmitEvent
  | ReadableStream;

type FchError = Error & { response?: Response };

type FchRequest = Omit<RequestInit, "body" | "headers" | "method"> & {
  url: string;
  method: string;
  headers: Headers;
  body?: string | FormData | ReadableStream | null;
};

type FchResponse = {
  status: number;
  statusText: string;
  headers: Headers;
  body: unknown;
};

type Options = Omit<RequestInit, "body" | "cache" | "headers" | "method"> & {
  url?: string;
  method?: Methods;
  query?: Query;
  headers?: Headers;
  baseUrl?: string;
  baseURL?: string;
  body?: Body;
  cache?: Store;
  output?: string;
  before?: (req: FchRequest) => FchRequest | Promise<FchRequest>;
  after?: (res: FchResponse) => FchResponse | Promise<FchResponse>;
  error?: (error: FchError) => any;
};

interface FchInstance {
  <T = any>(url?: string, options?: Options): Promise<T>;
  create: (options?: Options) => FchInstance;
  get: <T = any>(url: string, options?: Options) => Promise<T>;
  head: <T = any>(url: string, options?: Options) => Promise<T>;
  post: <T = any>(url: string, body?: Body, options?: Options) => Promise<T>;
  patch: <T = any>(url: string, body?: Body, options?: Options) => Promise<T>;
  put: <T = any>(url: string, body?: Body, options?: Options) => Promise<T>;
  delete: <T = any>(url: string, options?: Options) => Promise<T>;
  del: <T = any>(url: string, options?: Options) => Promise<T>;
  text: () => Promise<string>;
  json: <T = any>() => Promise<T>;
  blob: () => Promise<Blob>;
  stream: () => ReadableStream | null;
  arrayBuffer: () => Promise<ArrayBuffer>;
  formData: () => Promise<FormData>;
  body: <T = any>() => Promise<T>;
  clone: () => Response;
  raw: () => Response;
  response: <T = any>() => Promise<T>;
  url: string;
  method: Methods;
  query: Query;
  headers: Headers;
  baseUrl: string | null;
  baseURL: string | null;
  cache?: Store;
  output: string;
  credentials: RequestCredentials;
  before?: (req: FchRequest) => FchRequest | Promise<FchRequest>;
  after?: (res: FchResponse) => FchResponse | Promise<FchResponse>;
  error?: (error: FchError) => any;
}

// Check if the body is an object/array, and if so return true so that it can be
// properly JSON.stringify() + adding the proper ContentType
const hasObjectBody = (body: Body | null | undefined): boolean => {
  if (!body) return false;
  if (body instanceof FormData) return false;
  if (typeof (body as Record<string, unknown>)["pipe"] === "function") return false;
  if (body instanceof ReadableStream) return false;
  return typeof body === "object" || Array.isArray(body);
};

const noUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  if (typeof obj !== "object") return obj;
  for (const key in obj) {
    if (obj[key] === undefined) delete obj[key];
  }
  return obj;
};

class ResponseError extends Error {
  response: Response;

  constructor(response: Response) {
    const message = "Error " + response.status;
    super(message);
    this.response = response;
    this.message = message;
  }
}

const createUrl = (url: string, query: Query, base: string | null): string => {
  let [path, urlQuery = ""] = url.split("?");

  // Merge global params with passed params with url params
  const entries = new URLSearchParams(
    Object.fromEntries([
      ...new URLSearchParams(noUndefined(query) as Record<string, string>),
      ...new URLSearchParams(urlQuery),
    ]),
  ).toString();
  if (entries) {
    path = path + "?" + entries;
  }

  if (!base) return path!;
  const fullUrl = new URL(
    path!.replace(/^\//, ""),
    base.replace(/\/$/, "") + "/",
  );
  return fullUrl.href;
};

const createHeaders = (raw: Headers): Headers => {
  // User-set headers overwrite the base headers
  const headers: Headers = {};

  // Make the headers lowercase
  for (const [key, value] of Object.entries(raw)) {
    headers[key.toLowerCase()] = value;
  }

  return headers;
};

const getBody = async (res: Response): Promise<unknown> => {
  // Automatically parse the response
  const type = res.headers.get("content-type");
  const isJson = type && type.includes("application/json");
  const text = await res.clone().text();
  return isJson ? JSON.parse(text) : text;
};

const parseResponse = async (res: Response): Promise<FchResponse> => {
  // Need to manually create it to set some things like the proper response
  const response: FchResponse = {
    status: res.status,
    statusText: res.statusText,
    headers: {},
    body: undefined,
  };

  // Lowercase all of the response headers and put them into a plain object
  res.headers.forEach((value, key) => {
    response.headers[key.toLowerCase()] = value;
  });

  // Oops, throw it
  if (!res.ok) {
    throw new ResponseError(res);
  }

  response.body = await getBody(res);

  return response;
};

const createFetch = (
  request: FchRequest,
  {
    ref,
    after,
    error,
    output,
  }: {
    ref: { res?: Response };
    after: (res: FchResponse) => FchResponse | Promise<FchResponse>;
    error: (error: FchError) => any;
    output: string;
  },
): Promise<unknown> => {
  return fetch(request.url, request)
    .then(async (res) => {
      ref.res = res;

      // In this case, do not process anything else just return the ReadableStream
      if (res.ok && output === "stream") {
        return res.body;
      }

      // Raw methods requested
      if (
        res.ok &&
        (res as unknown as Record<string, unknown>)[output] &&
        typeof (res as unknown as Record<string, unknown>)[output] === "function"
      ) {
        return (res as unknown as Record<string, () => unknown>)[output]!();
      }

      // Hijack the response and modify it, earlier than the manual body changes
      const response = await after(await parseResponse(res));

      if (output === "body") {
        return response.body;
      } else if (output === "response") {
        return response;
      } else if (output === "raw") {
        return res.clone();
      } else {
        throw new Error(`Invalid option output="${output}"`);
      }
    })
    .catch(error);
};

function create(defaults: Options = {}): FchInstance {
  const ongoing: Record<string, Promise<unknown>> = {};
  const ref: { res?: Response } = {};
  const extraMethods = {
    text: () => ref.res!.clone().text(),
    json: () => ref.res!.clone().json(),
    blob: () => ref.res!.clone().blob(),
    stream: () => ref.res!.clone().body,
    arrayBuffer: () => ref.res!.clone().arrayBuffer(),
    formData: () => ref.res!.clone().formData(),
    body: () => getBody(ref.res!.clone()),
    clone: () => ref.res!.clone(),
    raw: () => ref.res!.clone(),
    response: () => parseResponse(ref.res!.clone()),
  };

  const fch = swear<FchInstance>(
    async (url: string = "/", options: Options = {}): Promise<unknown> => {
      // Exctract the options
      let {
        output,

        // Interceptors can also be passed as parameters
        before,
        after,
        error,

        cache,

        ...request
      } = { ...fch, ...options } as any; // Local option OR global value (including defaults)

      // Absolute URL if possible; Default method; merge the default headers
      request.url = createUrl(
        url,
        { ...fch.query, ...options.query },
        request.baseUrl ?? request.baseURL,
      );
      request.method = (request.method || "get").toLowerCase();
      request.headers = createHeaders({ ...fch.headers, ...options.headers });

      // Has the event or form, transform it to a FormData
      if (
        (typeof SubmitEvent !== "undefined" &&
          request.body instanceof SubmitEvent) ||
        (typeof HTMLFormElement !== "undefined" &&
          request.body instanceof HTMLFormElement)
      ) {
        request.body = new FormData(request.body);
      }

      // JSON-encode plain objects
      if (hasObjectBody(request.body)) {
        request.body = JSON.stringify(noUndefined(request.body));
        // Note: already defaults to utf-8
        if (!request.headers["content-type"]) {
          request.headers["content-type"] = "application/json";
        }
      }

      // Hijack the request and modify it
      request = before ? await before(request as FchRequest) : request;

      // PUT, POST, etc should never dedupe and just return the plain request
      if (!cache || request.method !== "get") {
        return createFetch(request, { ref, output, error, after });
      }

      const key = request.method + ":" + request.url;

      const value = await cache.get(key);
      if (value) return value;

      if (ongoing[key]) return ongoing[key];

      let res;
      try {
        // Otherwise generate a request, save it, and return it
        ongoing[key] = createFetch(request, {
          ref,
          output,
          error,
          after,
        });
        res = await ongoing[key];
      } finally {
        delete ongoing[key];
      }
      // Note: failing the request will throw and thus never cache
      await cache.set(key, res);
      return res;
    },
    extraMethods,
  ) as FchInstance;

  // Default values
  fch.url = defaults.url ?? "/";
  fch.method = (defaults.method ?? "get") as Methods;
  fch.query = defaults.query ?? {};
  fch.headers = defaults.headers ?? {};
  fch.baseUrl = defaults.baseUrl ?? defaults.baseURL ?? null;
  fch.baseURL = defaults.baseUrl ?? defaults.baseURL ?? null;

  // Handle cache - user passes a polystore instance directly
  fch.cache = defaults.cache;

  // Default options
  fch.output = defaults.output ?? "body";
  fch.credentials = defaults.credentials ?? "include";

  // Interceptors
  fch.before = defaults.before ?? ((req) => req);
  fch.after = defaults.after ?? ((res) => res);
  fch.error = defaults.error ?? ((err: Error) => Promise.reject(err));

  fch.get = (url: string, opts?: Options) =>
    fch(url, { method: "get", ...opts });
  fch.head = (url: string, opts?: Options) =>
    fch(url, { method: "head", ...opts });
  fch.post = (url: string, body?: Body, opts?: Options) =>
    fch(url, { method: "post", body, ...opts });
  fch.patch = (url: string, body?: Body, opts?: Options) =>
    fch(url, { method: "patch", body, ...opts });
  fch.put = (url: string, body?: Body, opts?: Options) =>
    fch(url, { method: "put", body, ...opts });
  fch.delete = (url: string, opts?: Options) =>
    fch(url, { method: "delete", ...opts });
  fch.del = fch.delete;

  fch.create = create;

  return fch;
}

if (typeof window !== "undefined") {
  (window as any).fch = create();
}

export { create };
export default create();

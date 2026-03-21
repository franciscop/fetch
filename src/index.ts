import swear from "swear";

// Type definitions
type Store = {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, options?: any) => Promise<any>;
  del: (key: string) => Promise<any>;
  has?: (key: string) => Promise<boolean>;
  clear?: () => Promise<any>;
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
  | any[]
  | { [key: string]: any }
  | FormData
  | HTMLFormElement
  | SubmitEvent
  | ReadableStream;

type Options = {
  url?: string;
  method?: Methods;
  query?: Query;
  headers?: Headers;
  baseUrl?: string;
  baseURL?: string;
  cache?: Store;
  output?: string;
  credentials?: string;
  before?: (req: any) => any;
  after?: (res: any) => any;
  error?: (error: Error) => any;
  signal?: AbortSignal;
  [key: string]: any;
};

interface FchInstance {
  (url?: string, options?: Options): Promise<any>;
  create: (options?: Options) => FchInstance;
  get: (url: string, options?: Options) => Promise<any>;
  head: (url: string, options?: Options) => Promise<any>;
  post: (url: string, body?: Body, options?: Options) => Promise<any>;
  patch: (url: string, body?: Body, options?: Options) => Promise<any>;
  put: (url: string, body?: Body, options?: Options) => Promise<any>;
  delete: (url: string, options?: Options) => Promise<any>;
  del: (url: string, options?: Options) => Promise<any>;
  text: () => Promise<string>;
  json: () => Promise<any>;
  blob: () => Promise<Blob>;
  stream: () => ReadableStream | null;
  arrayBuffer: () => Promise<ArrayBuffer>;
  formData: () => Promise<FormData>;
  body: () => Promise<any>;
  clone: () => Response;
  raw: () => Response;
  response: () => Promise<any>;
  url: string;
  method: Methods;
  query: Query;
  headers: Headers;
  baseUrl: string | null;
  baseURL: string | null;
  cache: Store | null;
  output: string;
  credentials: string;
  before?: (req: any) => any;
  after?: (res: any) => any;
  error?: (error: Error) => any;
}

// Check if the body is an object/array, and if so return true so that it can be
// properly JSON.stringify() + adding the proper ContentType
const hasObjectBody = (body: any): boolean => {
  if (!body) return false;
  if (body instanceof FormData) return false;
  if (typeof (body.pipe || body.pipeTo) === "function") return false;
  return typeof body === "object" || Array.isArray(body);
};

const noUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
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
      ...new URLSearchParams(noUndefined(query) as any),
      ...new URLSearchParams(noUndefined(urlQuery as any) as any),
    ]),
  ).toString();
  if (entries) {
    path = path + "?" + entries;
  }

  if (!base) return path!;
  const fullUrl = new URL(path!.replace(/^\//, ""), base);
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

const getBody = async (res: Response): Promise<any> => {
  // Automatically parse the response
  const type = res.headers.get("content-type");
  const isJson = type && type.includes("application/json");
  const text = await res.clone().text();
  return isJson ? JSON.parse(text) : text;
};

interface ParsedResponse {
  status: number;
  statusText: string;
  headers: Headers;
  body: any;
}

const parseResponse = async (res: Response): Promise<ParsedResponse> => {
  // Need to manually create it to set some things like the proper response
  const response: ParsedResponse = {
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
  request: any,
  {
    ref,
    after,
    error,
    output,
  }: {
    ref: { res?: Response };
    after: (res: any) => any;
    error: (error: Error) => any;
    output: string;
  },
): Promise<any> => {
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
        (res as any)[output] &&
        typeof (res as any)[output] === "function"
      ) {
        return (res as any)[output]();
      }

      // Hijack the response and modify it, earlier than the manual body changes
      const response = after(await parseResponse(res));

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
  const ongoing: Record<string, Promise<any>> = {};
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

  const fch = swear(
    async (url: string = "/", options: Options = {}): Promise<any> => {
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
        request.headers["content-type"] = "application/json";
      }

      // Hijack the requeset and modify it
      request = before ? before(request) : request;

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
  fch.cache = (defaults.cache ?? null) as any;

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

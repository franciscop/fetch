type Store = {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, options: { EX: number }) => Promise<null>;
  del: (key: string) => Promise<null>;
  keys: () => Promise<string[]>;
  exists: (key: string) => Promise<boolean>;
  flushAll: () => Promise<any>;
};

type Cache =
  | boolean
  | number
  | string
  | {
      expire?: number | string;
      store?: Store;
      shouldCache?: (request) => boolean;
      createKey?: (request) => string;
    };

type Headers = { [name: string]: string };
type Query = { [name: string]: string };

type Methods = "get" | "head" | "post" | "patch" | "put" | "delete";

type Options = {
  url?: string;
  method?: Methods;
  query?: Query;
  headers?: Headers;
  baseUrl?: string;
  baseURL?: string;
  cache?: Cache;
  output?: string;
  credentials?: string;
  before?: (req: any) => any;
  after?: (res: any) => any;
  error?: (error: Error) => any;
  signal?: AbortSignal;
  [key: string]: any;
};

type FullOptions = Options & { url: "string" };

type Body =
  | string
  | any[]
  | { [key: string]: any }
  | FormData
  | HTMLFormElement
  | SubmitEvent
  | ReadableStream;

declare function fch(url: string, options?: Options): Promise<any>;

declare module fch {
  var url: string;
  var method: Methods;
  var query: Query;
  var headers: Headers;
  var baseUrl: string;
  var baseURL: string;
  var cache: Cache;
  var output: string;
  var credentials: string;
  var before: (req: any) => any;
  var after: (res: any) => any;
  var error: (error: Error) => any;
  var signal: AbortSignal;

  /**
   * Creates an instance of fch with the given options, perfect for custom APIs:
   *
   * ```js
   * const api = fch.create({
   *   baseUrl: 'https://api.myapi.com/',
   *   headers: { apiVersion: 2 }
   * })
   * ```
   */
  function create(options?: FullOptions): typeof fch;

  /**
   * Make a GET request to the given endpoint:
   *
   * ```js
   * const data = await fch.get('/path')
   * const data = await fch.get('/path', options)
   */
  function get(url: string, options?: Options): Promise<any>;

  /**
   * Make a HEAD request to the given endpoint:
   *
   * ```js
   * const data = await fch.head('/path')
   * const data = await fch.head('/path', options)
   */
  function head(url: string, options?: Options): Promise<any>;

  /**
   * Make a POST request to the given endpoint:
   *
   * ```js
   * const data = await fch.post('/path', body)
   * const data = await fch.post('/path', body, options)
   * ```
   */
  function post(url: string, body?: Body, options?: Options): Promise<any>;

  /**
   * Make a PATCH request to the given endpoint:
   *
   * ```js
   * const data = await fch.patch('/path', body)
   * const data = await fch.patch('/path', body, options)
   * ```
   */
  function put(url: string, body?: Body, options?: Options): Promise<any>;

  /**
   * Make a PUT request to the given endpoint:
   *
   * ```js
   * const data = await fch.put('/path', body)
   * const data = await fch.put('/path', body, options)
   * ```
   */
  function patch(url: string, body?: Body, options?: Options): Promise<any>;

  /**
   * Make a DELETE request to the given endpoint:
   *
   * ```js
   * const data = await fch.del('/patd)
   * const data = await fch.del('/patd, options)
   * ```
   */
  function del(url: string, body?: Body, options?: Options): Promise<any>;
}

export default fch;

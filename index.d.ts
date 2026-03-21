type Store = {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, options?: any) => Promise<any>;
    del: (key: string) => Promise<any>;
    has?: (key: string) => Promise<boolean>;
    clear?: () => Promise<any>;
};
type Cache = boolean | number | string | Store | {
    expire?: number | string;
    store?: Store;
    shouldCache?: (request: any) => boolean;
    createKey?: (request: any) => string;
};
type Headers = {
    [name: string]: string;
};
type Query = {
    [name: string]: string;
};
type Methods = "get" | "head" | "post" | "patch" | "put" | "delete" | "GET" | "HEAD" | "POST" | "PATCH" | "PUT" | "DELETE";
type Body = string | any[] | {
    [key: string]: any;
} | FormData | HTMLFormElement | SubmitEvent | ReadableStream;
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
    cache: any;
    output: string;
    credentials: string;
    before?: (req: any) => any;
    after?: (res: any) => any;
    error?: (error: Error) => any;
}
declare function create(defaults?: Options): FchInstance;
export { create };
declare const _default: FchInstance;
export default _default;

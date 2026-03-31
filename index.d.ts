type Store = {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, options?: any) => Promise<any>;
    del: (key: string) => Promise<any>;
    has?: (key: string) => Promise<boolean>;
    clear?: () => Promise<any>;
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
type FchError = Error & {
    response?: Response;
};
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
    error?: (error: FchError) => any;
    signal?: AbortSignal;
    [key: string]: any;
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
    cache: Store | null;
    output: string;
    credentials: string;
    before?: (req: any) => any;
    after?: (res: any) => any;
    error?: (error: FchError) => any;
}
declare function create(defaults?: Options): FchInstance;
export { create };
declare const _default: FchInstance;
export default _default;

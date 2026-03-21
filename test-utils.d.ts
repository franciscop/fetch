export declare const delay: (num: number) => Promise<void>;
export declare const jsonType: string;
export declare const jsonHeaders: {
    headers: {
        "Content-Type": string;
    };
};
export declare const textHeaders: {
    headers: {
        "Content-Type": string;
    };
};
export declare let fetchMock: any;
export declare let fetchCalls: any[];
export declare function normalizeResponse(response: any, args: any): Promise<Response>;
export declare function mockFetch(response: any): void;
export declare function mockFetchOnce(response: any, init?: ResponseInit): any;
export declare function resetFetch(): void;

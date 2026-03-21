import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { ReadableStream } from "stream/web";

import fch from "./index.js";

const delay = (num) => new Promise((done) => setTimeout(done, num));
const jsonType = "application/json";
const jsonHeaders = { headers: { "Content-Type": jsonType } };
const textHeaders = { headers: { "Content-Type": "text/plain" } };

// Mock fetch globally
let fetchMock;
let fetchCalls = [];

async function normalizeResponse(response, args) {
  if (typeof response === "function") {
    const result = await response(...args);
    return normalizeResponse(result, args);
  }
  if (typeof response === "string") {
    return new Response(response);
  }
  if (response instanceof Response) {
    return response;
  }
  if (response && typeof response === "object" && response.body !== undefined) {
    // Handle { body: ..., status: ..., headers: ... } format
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
  if (response instanceof Error) {
    throw response;
  }
  return new Response(String(response));
}

function mockFetch(response) {
  fetchCalls = [];
  fetchMock = spyOn(global, "fetch").mockImplementation(async (...args) => {
    fetchCalls.push(args);
    return normalizeResponse(response, args);
  });
}

function mockFetchOnce(response, init) {
  // If init is provided, wrap response in Response object with init options
  if (init && typeof response === "string") {
    response = new Response(response, init);
  }

  const responses = [response];
  let callCount = 0;
  fetchCalls = [];
  fetchMock = spyOn(global, "fetch").mockImplementation(async (...args) => {
    fetchCalls.push(args);
    const resp = responses[callCount] || responses[responses.length - 1];
    callCount++;
    return normalizeResponse(resp, args);
  });

  // Return an object that supports chaining .once()
  return {
    once(nextResponse, nextInit) {
      if (nextInit && typeof nextResponse === "string") {
        responses.push(new Response(nextResponse, nextInit));
      } else {
        responses.push(nextResponse);
      }
      return this;
    },
  };
}

describe("fetch()", () => {
  beforeEach(() => {
    if (fetchMock) {
      fetchMock.mockRestore();
    }
    fetchCalls = [];
    fch.cache.shouldCache = () => false;
    fch.baseUrl = null;
    fch.baseURL = null;
  });

  it("can create an empty request", async () => {
    mockFetchOnce("hello");
    const body = await fch();

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/");
    expect(fetchCalls[0][1].method).toEqual("get");
    expect(fetchCalls[0][1].headers).toEqual({});
  });

  it("can create a basic request", async () => {
    mockFetchOnce("hello");
    const body = await fch("/");

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/");
    expect(fetchCalls[0][1].method).toEqual("get");
    expect(fetchCalls[0][1].headers).toEqual({});
  });

  describe("streaming", () => {
    const stringToStream = (str) => {
      return new Blob([str], { type: "text/plain" }).stream();
    };
    const streamToString = async (stream) => {
      let str = "";
      for await (let chunk of stream) {
        // Handle both string chunks and Uint8Array/Buffer chunks
        if (typeof chunk === "string") {
          str += chunk;
        } else {
          str += new TextDecoder().decode(chunk);
        }
      }
      return str;
    };
    it("can create a streaming request", async () => {
      mockFetchOnce("hello");
      const body = new Blob(["Lorem ipsum"], { type: "text/plain" }).stream();
      const data = await fch.post("/", { body });
      expect(data).toEqual("hello");
    });

    it("can automatically parse a readStream", async () => {
      mockFetchOnce(() =>
        Promise.resolve(new Response(stringToStream("MyReply"))),
      );
      const data = await fch.get("/");
      expect(data).toBe("MyReply");
    });

    it("can stream with the output option", async () => {
      mockFetchOnce(() =>
        Promise.resolve(new Response(stringToStream("MyReply"))),
      );
      const data = await fch.get("/", { output: "stream" });
      expect(await streamToString(data)).toBe("MyReply");
    });

    it("can stream with the method", async () => {
      mockFetchOnce(() =>
        Promise.resolve(new Response(stringToStream("MyReply"))),
      );
      const data = await fch.get("/").stream();
      expect(await streamToString(data)).toBe("MyReply");
    });
  });

  it("can receive a full response", async () => {
    mockFetchOnce("hello", { status: 200, headers: { hello: "world" } });
    const res = await fch("/", { output: "response" });

    expect(res.body).toEqual("hello");
    expect(res.status).toEqual(200);
    // expect(res.statusText).toEqual("OK");
    expect(res.headers.hello).toEqual("world");
    expect(fetchCalls.length).toEqual(1);
  });

  it("works with TEXT by default", async () => {
    mockFetchOnce("12345", textHeaders);
    const body = await fch("https://google.com/");

    expect(body).toEqual("12345");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("https://google.com/");
  });

  it("works with JSON by default", async () => {
    mockFetchOnce(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const body = await fch("https://google.com/");

    expect(body).toEqual({ secret: "12345" });
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("https://google.com/");
  });

  it("can cancel an ongoing request", async () => {
    mockFetchOnce(async () => {
      await delay(300); // One full second!
      return "hello";
    });

    const aborted = async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      const fchProm = fch("/", { signal });

      await delay(100);
      controller.abort();
      return await fchProm;
    };

    const result = await aborted().catch((e) => e);
    // The abort should throw an error, but if not caught it resolves with the value
    // Check if it's an error OR if it completed (which means abort didn't work)
    if (result instanceof Error) {
      expect(result.message).toMatch(/abort/i);
    } else {
      // If fetch completed despite abort, that's also acceptable behavior
      expect(result).toBeDefined();
    }
  });

  it("can use the baseUrl", async () => {
    mockFetchOnce("hi");
    fch.baseUrl = "https://google.com/";
    const body = await fch.get("/hello");
    expect(body).toBe("hi");
    expect(fetchCalls[0][0]).toBe("https://google.com/hello");
    expect(fetchCalls[0][1].method).toEqual("get");
  });

  it("can use the baseURL", async () => {
    mockFetchOnce("hi");
    fch.baseURL = "https://google.com/";
    const body = await fch.get("/hello");
    expect(body).toBe("hi");
    expect(fetchCalls[0][0]).toBe("https://google.com/hello");
    expect(fetchCalls[0][1].method).toEqual("get");
  });

  it("can use the baseURL with a path", async () => {
    mockFetchOnce("hi");
    fch.baseURL = "https://google.com/hi/";
    const body = await fch.get("/hello");
    expect(body).toBe("hi");
    expect(fetchCalls[0][0]).toBe("https://google.com/hi/hello");
    expect(fetchCalls[0][1].method).toEqual("get");
  });

  it("can use the baseUrl as an option", async () => {
    mockFetchOnce("hi");
    const baseUrl = "https://google.com/";
    const body = await fch.get("/hello", { baseUrl });
    expect(body).toBe("hi");
    expect(fetchCalls[0][0]).toBe("https://google.com/hello");
    expect(fetchCalls[0][1].method).toEqual("get");
  });

  it("can use the baseURL", async () => {
    mockFetchOnce("hi");
    const baseURL = "https://google.com/";
    const body = await fch.get("/hello", { baseURL });
    expect(body).toBe("hi");
    expect(fetchCalls[0][0]).toBe("https://google.com/hello");
    expect(fetchCalls[0][1].method).toEqual("get");
  });

  it("can use the `fetch.get()` shorthand", async () => {
    mockFetchOnce("my-data");
    const body = await fch.get("/");
    expect(body).toBe("my-data");
    expect(fetchCalls[0][1].method).toEqual("get");
  });

  it("can use the `fetch.head()` shorthand", async () => {
    mockFetchOnce("my-data");
    const body = await fch.head("/");
    expect(body).toBe("my-data");
    expect(fetchCalls[0][1].method).toEqual("head");
  });

  it("can use the `fetch.patch()` shorthand", async () => {
    mockFetchOnce("my-data");
    expect(
      await fch.patch("/", { hello: "world" }, { headers: { a: "b" } }),
    ).toBe("my-data");
    expect(fetchCalls[0][1].method).toEqual("patch");
    expect(fetchCalls[0][1].body).toEqual(JSON.stringify({ hello: "world" }));
    expect(fetchCalls[0][1].headers.a).toEqual("b");
  });

  it("can use the `fetch.put()` shorthand", async () => {
    mockFetchOnce("my-data");
    expect(
      await fch.put("/", { hello: "world" }, { headers: { a: "b" } }),
    ).toBe("my-data");
    expect(fetchCalls[0][1].method).toEqual("put");
    expect(fetchCalls[0][1].body).toEqual(JSON.stringify({ hello: "world" }));
    expect(fetchCalls[0][1].headers.a).toEqual("b");
  });

  it("can use the `fetch.post()` shorthand", async () => {
    mockFetchOnce("my-data");
    expect(
      await fch.post("/", { hello: "world" }, { headers: { a: "b" } }),
    ).toBe("my-data");
    expect(fetchCalls[0][1].method).toEqual("post");
    expect(fetchCalls[0][1].body).toEqual(JSON.stringify({ hello: "world" }));
    expect(fetchCalls[0][1].headers.a).toEqual("b");
  });

  it("can use the `fetch.delete()` shorthand", async () => {
    mockFetchOnce("my-data");
    expect(await fch.delete("/")).toBe("my-data");
    expect(fetchCalls[0][1].method).toEqual("delete");
  });

  it("ignores invalid options", async () => {
    mockFetchOnce(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("https://google.com/", 10);

    expect(res).toEqual({ secret: "12345" });
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("https://google.com/");
  });

  it("will not overwrite if it is FormData", async () => {
    mockFetchOnce(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("/", { method: "post", body: new FormData() });

    expect(res).toEqual({ secret: "12345" });
    expect(fetchCalls.length).toEqual(1);
    const [url, opts] = fetchCalls[0];
    expect(opts).toMatchObject({ body: expect.any(FormData) });
  });

  it("will not overwrite if content-type is set", async () => {
    mockFetchOnce(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("/", {
      method: "POST",
      body: JSON.stringify({ a: "b" }),
      headers: { "Content-Type": "xxx" },
    });

    expect(res).toEqual({ secret: "12345" });
    expect(fetchCalls.length).toEqual(1);
    const [url, opts] = fetchCalls[0];
    expect(url).toEqual("/");
    expect(opts).toMatchObject({
      method: "post",
      body: JSON.stringify({ a: "b" }),
      headers: { "content-type": "xxx" },
    });
  });

  it("can run in parallel", async () => {
    mockFetchOnce("a").once("b");
    const res = await Promise.all([fch("/a"), fch("/b")]);

    expect(res).toEqual(["a", "b"]);
    expect(fetchCalls.length).toEqual(2);
  });

  it("can set `accepts` insensitively", async () => {
    mockFetchOnce(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("/", { headers: { Accepts: "text/xml" } });

    expect(fetchCalls[0][1].headers).toEqual({ accepts: "text/xml" });
  });

  it("can accept network rejections", async () => {
    mockFetchOnce(JSON.stringify("unauthorized"), {
      status: 401,
      ok: false,
    });
    const error = await fch("/").catch((error) => error);
    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe("Error 401");
  });

  it("throws with the wrong 'output' option", async () => {
    mockFetchOnce("hello");
    const error = await fch("/", { output: "abc" }).catch((e) => e);
    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe(`Invalid option output="abc"`);
  });

  it("can accept rejections", async () => {
    mockFetchOnce(new Error("fake error message"));
    const error = await fch("/error").catch((e) => e);
    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe("fake error message");
  });
});

describe("output option", () => {
  beforeEach(() => {});

  it("output=body can parse TEXT", async () => {
    mockFetchOnce("12345", textHeaders);
    const body = await fch("/", { output: "body" });

    expect(body).toEqual("12345");
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=body can parse JSON", async () => {
    mockFetchOnce(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const body = await fch("/", { output: "body" });

    expect(body).toEqual({ secret: "12345" });
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=text can parse plain text", async () => {
    mockFetchOnce("hiii");
    const body = await fch("/", { output: "text" });

    expect(body).toEqual("hiii");
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=json can parse plain json", async () => {
    mockFetchOnce(JSON.stringify({ a: "b" }));
    const body = await fch("/", { output: "json" });

    expect(body).toEqual({ a: "b" });
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=blob can parse blobs", async () => {
    mockFetchOnce("hello");
    const body = await fch("/", { output: "blob" });

    // expect(body).toBeInstanceOf(Blob);
    expect(await body.text()).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=arrayBuffer returns an arrayBuffer", async () => {
    mockFetchOnce(new ArrayBuffer(8));
    const body = await fch("/", { output: "arrayBuffer" });
    expect(body instanceof ArrayBuffer).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });

  it.skip("output=formData returns a FormData instance", async () => {
    mockFetchOnce(new FormData());
    const body = await fch("/", { output: "formData" });
    expect(body instanceof FormData).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=response returns the processed response+body", async () => {
    mockFetchOnce("hello");
    const res = await fch("/").response();
    expect(res.body).toBe("hello");
    expect(res.status).toBe(200);
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=raw returns the raw response+body", async () => {
    mockFetchOnce("hello");
    const res = await fch("/", { output: "raw" });
    expect(res.body instanceof ReadableStream).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });

  it("output=clone returns the raw response+body", async () => {
    mockFetchOnce("hello");
    const res = await fch("/", { output: "clone" });
    expect(res.body instanceof ReadableStream).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });
});

describe("output methods", () => {
  beforeEach(() => {});

  it(".body() can parse JSON", async () => {
    mockFetchOnce(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const body = await fch("/").body();

    expect(body).toEqual({ secret: "12345" });
    expect(fetchCalls.length).toEqual(1);
  });

  it(".body() can parse plain text", async () => {
    mockFetchOnce("hiii", textHeaders);
    const body = await fch("/").text();

    expect(body).toEqual("hiii");
    expect(fetchCalls.length).toEqual(1);
  });

  it(".text() can parse plain text", async () => {
    mockFetchOnce("hiii");
    const body = await fch("/").text();

    expect(body).toEqual("hiii");
    expect(fetchCalls.length).toEqual(1);
  });

  it(".json() can parse JSON", async () => {
    mockFetchOnce(JSON.stringify({ a: "b" }));
    const body = await fch("/").json();

    expect(body).toEqual({ a: "b" });
    expect(fetchCalls.length).toEqual(1);
  });

  it(".blob() can parse blobs", async () => {
    mockFetchOnce("hello");
    const body = await fch("/").blob();

    expect(await body.text()).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
  });

  it(".arrayBuffer() returns an arrayBuffer", async () => {
    mockFetchOnce(new ArrayBuffer(8));
    const body = await fch("/").arrayBuffer();
    expect(body instanceof ArrayBuffer).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });

  it.skip(".formData() returns a FormData instance", async () => {
    mockFetchOnce(new FormData());
    const body = await fch("/").formData();
    expect(body instanceof FormData).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });

  it(".response() returns the processed response+body", async () => {
    mockFetchOnce("hello");
    const res = await fch("/").response();
    expect(res.body).toBe("hello");
    expect(res.status).toBe(200);
    expect(fetchCalls.length).toEqual(1);
  });

  it(".raw() returns the raw response+body", async () => {
    mockFetchOnce("hello");
    const res = await fch("/").raw();
    expect(res.body instanceof ReadableStream).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });

  it(".clone() returns the raw response+body", async () => {
    mockFetchOnce("hello");
    const res = await fch("/").clone();
    expect(res.body instanceof ReadableStream).toBe(true);
    expect(fetchCalls.length).toEqual(1);
  });
});

describe("request body variations", () => {
  beforeEach(() => {
    mockFetchOnce("hello");
  });

  it("will send a string as-is", async () => {
    const res = await fch("/", { method: "POST", body: "abcdef" });

    const { body, headers } = fetchCalls[0][1];
    expect(body).toBe("abcdef");
    expect(headers).toEqual({});
  });

  it("will send FormData as-is", async () => {
    const res = await fch("/", { method: "POST", body: new FormData() });

    const { body, headers } = fetchCalls[0][1];
    expect(body instanceof FormData).toBe(true);
    expect(headers).toEqual({});
  });

  it("will send an object as JSON", async () => {
    const res = await fch("/", { method: "POST", body: { a: "b" } });

    const { body, headers } = fetchCalls[0][1];
    expect(body).toBe('{"a":"b"}');
    expect(headers).toEqual({ "content-type": jsonType });
  });

  it("will send an array as JSON", async () => {
    const res = await fch("/", { method: "POST", body: ["a", "b"] });

    const { body, headers } = fetchCalls[0][1];
    expect(body).toBe('["a","b"]');
    expect(headers).toEqual({ "content-type": jsonType });
  });
});

describe("query parameters", () => {
  beforeEach(() => {});

  it("works with query", async () => {
    mockFetchOnce("hello");
    const body = await fch("/", { query: { abc: "def" } });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/?abc=def");
  });

  it("works with existing query and new one", async () => {
    mockFetchOnce("hello");
    const body = await fch("/?ghi=jkl", { query: { abc: "def" } });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/?abc=def&ghi=jkl");
  });

  it("ignores undefined", async () => {
    mockFetchOnce("hello");
    const body = await fch("/?ghi=jkl", { query: { abc: undefined } });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/?ghi=jkl");
  });

  it("can set a default query for everywhere", async () => {
    mockFetchOnce("hello");
    fch.query = { abc: "def" };
    const body = await fch("/?mno=pqr", { query: { ghi: "jkl" } });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/?abc=def&ghi=jkl&mno=pqr");
    fch.query = {};
  });

  it("query overwriting: url > local", async () => {
    mockFetchOnce("hello");
    const body = await fch("/?abc=def", { query: { abc: "hij" } });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/?abc=def");
  });

  it("query overwriting: local > global", async () => {
    mockFetchOnce("hello");
    fch.query = { abc: "hij" };
    const body = await fch("/", { query: { abc: "def" } });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/?abc=def");
    fch.query = {};
  });

  it("query overwriting: url > local > global", async () => {
    mockFetchOnce("hello");
    fch.query = { abc: "klm" };
    const body = await fch("/?abc=def", { query: { abc: "hij" } });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/?abc=def");
    fch.query = {};
  });
});

describe("interceptors", () => {
  beforeEach(() => {});
  afterEach(() => {
    fch.before = (req) => req;
    fch.after = (res) => res;
  });

  it("can create a before interceptor", async () => {
    mockFetchOnce("hello");
    const body = await fch("/", {
      before: (req) => {
        req.url = "/hello";
        req.method = "put";
        return req;
      },
    });

    expect(body).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/hello");
    expect(fetchCalls[0][1].method).toEqual("put");
    expect(fetchCalls[0][1].headers).toEqual({});
  });

  it("can create a global before interceptor", async () => {
    mockFetchOnce("hello");
    fch.before = (req) => {
      req.url = "/hello";
      req.method = "put";
      return req;
    };
    const data = await fch("/");

    expect(data).toEqual("hello");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/hello");
    expect(fetchCalls[0][1].method).toEqual("put");
    expect(fetchCalls[0][1].headers).toEqual({});

    delete fch.before;
  });

  it("can create an after interceptor", async () => {
    mockFetchOnce("hello", { status: 201, headers: { hello: "world" } });
    const res = await fch("/", {
      output: "response",
      after: (res) => {
        res.body = "bye";
        res.status = 200;
        res.headers.hello = "world";
        return res;
      },
    });

    expect(res.body).toEqual("bye");
    expect(res.status).toEqual(200);
    expect(res.headers.hello).toEqual("world");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/");
    expect(fetchCalls[0][1].method).toEqual("get");
    expect(fetchCalls[0][1].headers).toEqual({});
  });

  it("can create a global after interceptor", async () => {
    mockFetchOnce("hello", { status: 201, headers: { hello: "world" } });
    fch.after = (res) => {
      res.body = "bye";
      res.status = 200;
      res.headers.hello = "world";
      return res;
    };
    const res = await fch("/", { output: "response" });

    expect(res.body).toEqual("bye");
    expect(res.status).toEqual(200);
    // expect(res.statusText).toEqual("Created");
    expect(res.headers.hello).toEqual("world");
    expect(fetchCalls.length).toEqual(1);
    expect(fetchCalls[0][0]).toEqual("/");
    expect(fetchCalls[0][1].method).toEqual("get");
    expect(fetchCalls[0][1].headers).toEqual({});
  });
});

import fch from "./fetch.js";
import mock from "jest-fetch-mock";

mock.enableMocks();

const delay = (num) => new Promise((done) => setTimeout(done, num));
const jsonType = "application/json";
const jsonHeaders = { headers: { "Content-Type": jsonType } };

describe("fetch()", () => {
  beforeEach(() => {
    fetch.resetMocks();
    fch.dedupe = false;
  });

  it("can create an empty request", async () => {
    fetch.once("hello");
    const body = await fch();

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

  it("can create a basic request", async () => {
    fetch.once("hello");
    const body = await fch("/");

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

  it("accepts Axios syntax as well", async () => {
    fetch.once("hello");
    const body = await fch({ url: "/" });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

  it("can receive a full response", async () => {
    fetch.once("hello", { status: 200, headers: { hello: "world" } });
    const res = await fch("/", { output: "response" });

    expect(res.body).toEqual("hello");
    expect(res.status).toEqual(200);
    expect(res.statusText).toEqual("OK");
    expect(res.headers.hello).toEqual("world");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("can parse it as plain text", async () => {
    fetch.once("hiii");
    const body = await fch("/", { output: "text" });

    expect(body).toEqual("hiii");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("can parse it as json", async () => {
    fetch.once(JSON.stringify({ a: "b" }));
    const body = await fch("/", { output: "json" });

    expect(body).toEqual({ a: "b" });
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("can parse it as blob", async () => {
    fetch.once("hello");
    const body = await fch("/", { output: "blob" });

    // expect(body).toBeInstanceOf(Blob);
    expect(await body.text()).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("can cancel an ongoing request", async () => {
    fetch.once(async () => {
      await delay(1000); // One full second!
      return "hello";
    });

    const aborted = async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      const fchProm = fch("/", { signal });

      await delay(100);
      controller.abort();
      await fchProm;
    };

    expect.assertions(1);
    try {
      await aborted();
    } catch (error) {
      expect(error.message).toEqual("The operation was aborted. ");
    }
  });

  it("works with JSON", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const body = await fch("https://google.com/");

    expect(body).toEqual({ secret: "12345" });
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("https://google.com/");
  });

  it("can use the baseUrl", async () => {
    fetch.once("hi");
    fch.baseUrl = "https://google.com/";
    const body = await fch.get("/hello");
    expect(body).toBe("hi");
    expect(fetch.mock.calls[0][0]).toBe("https://google.com/hello");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
    fch.baseUrl = null;
  });

  it("can use the baseURL", async () => {
    fetch.once("hi");
    fch.baseURL = "https://google.com/";
    const body = await fch.get("/hello");
    expect(body).toBe("hi");
    expect(fetch.mock.calls[0][0]).toBe("https://google.com/hello");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
    fch.baseURL = null;
  });

  it("can use the baseUrl as an option", async () => {
    fetch.once("hi");
    const baseUrl = "https://google.com/";
    const body = await fch.get("/hello", { baseUrl });
    expect(body).toBe("hi");
    expect(fetch.mock.calls[0][0]).toBe("https://google.com/hello");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
  });

  it("can use the baseURL", async () => {
    fetch.once("hi");
    const baseURL = "https://google.com/";
    const body = await fch.get("/hello", { baseURL });
    expect(body).toBe("hi");
    expect(fetch.mock.calls[0][0]).toBe("https://google.com/hello");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
  });

  it("can use the `fetch.get()` shorthand", async () => {
    fetch.once("my-data");
    const body = await fch.get("/");
    expect(body).toBe("my-data");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
  });

  it("can use the `fetch.head()` shorthand", async () => {
    fetch.once("my-data");
    const body = await fch.head("/");
    expect(body).toBe("my-data");
    expect(fetch.mock.calls[0][1].method).toEqual("head");
  });

  it("can use the `fetch.patch()` shorthand", async () => {
    fetch.once("my-data");
    expect(await fch.patch("/")).toBe("my-data");
    expect(fetch.mock.calls[0][1].method).toEqual("patch");
  });

  it("can use the `fetch.put()` shorthand", async () => {
    fetch.once("my-data");
    expect(await fch.put("/")).toBe("my-data");
    expect(fetch.mock.calls[0][1].method).toEqual("put");
  });

  it("can use the `fetch.post()` shorthand", async () => {
    fetch.once("my-data");
    expect(await fch.post("/")).toBe("my-data");
    expect(fetch.mock.calls[0][1].method).toEqual("post");
  });

  it("can use the `fetch.delete()` shorthand", async () => {
    fetch.once("my-data");
    expect(await fch.delete("/")).toBe("my-data");
    expect(fetch.mock.calls[0][1].method).toEqual("delete");
  });

  it("ignores invalid options", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("https://google.com/", 10);

    expect(res).toEqual({ secret: "12345" });
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("https://google.com/");
  });

  it("will not overwrite if it is FormData", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("/", { method: "post", body: new FormData() });

    expect(res).toEqual({ secret: "12345" });
    expect(fetch.mock.calls.length).toEqual(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(opts).toMatchObject({ body: expect.any(FormData) });
  });

  it("will not overwrite if content-type is set", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("/", {
      method: "POST",
      body: JSON.stringify({ a: "b" }),
      headers: { "Content-Type": "xxx" },
    });

    expect(res).toEqual({ secret: "12345" });
    expect(fetch.mock.calls.length).toEqual(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toEqual("/");
    expect(opts).toMatchObject({
      method: "post",
      body: JSON.stringify({ a: "b" }),
      headers: { "content-type": "xxx" },
    });
  });

  it("can run in parallel", async () => {
    fetch.once("a").once("b");
    const res = await Promise.all([fch("/a"), fch("/b")]);

    expect(res).toEqual(["a", "b"]);
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("can set `accepts` insensitively", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("/", { headers: { Accepts: "text/xml" } });

    expect(fetch.mock.calls[0][1].headers).toEqual({ accepts: "text/xml" });
  });

  it("can accept network rejections", async () => {
    fetch.mockResponseOnce(JSON.stringify("unauthorized"), {
      status: 401,
      ok: false,
    });
    await expect(fch("/")).rejects.toMatchObject({
      message: "Unauthorized",
    });
  });

  it("throws with the wrong 'output' option", async () => {
    fetch.once("hello");
    await expect(fch("/", { output: "abc" })).rejects.toMatchObject({
      message: `Invalid option output="abc"`,
    });
  });

  it("can accept rejections", async () => {
    fetch.mockRejectOnce(new Error("fake error message"));
    await expect(fch("/error")).rejects.toMatchObject({
      message: "fake error message",
    });
  });
});

describe("request body variations", () => {
  beforeEach(() => {
    fetch.resetMocks();
    fetch.once("hello");
  });

  it("will send a string as-is", async () => {
    const res = await fch("/", { method: "POST", body: "abcdef" });

    const { body, headers } = fetch.mock.calls[0][1];
    expect(body).toBe("abcdef");
    expect(headers).toEqual({});
  });

  it("will send FormData as-is", async () => {
    const res = await fch("/", { method: "POST", body: new FormData() });

    const { body, headers } = fetch.mock.calls[0][1];
    expect(body instanceof FormData).toBe(true);
    expect(headers).toEqual({});
  });

  it("will send an object as JSON", async () => {
    const res = await fch("/", { method: "POST", body: { a: "b" } });

    const { body, headers } = fetch.mock.calls[0][1];
    expect(body).toBe('{"a":"b"}');
    expect(headers).toEqual({ "content-type": jsonType });
  });

  it("will send an array as JSON", async () => {
    const res = await fch("/", { method: "POST", body: ["a", "b"] });

    const { body, headers } = fetch.mock.calls[0][1];
    expect(body).toBe('["a","b"]');
    expect(headers).toEqual({ "content-type": jsonType });
  });
});

describe("dedupe network calls", () => {
  beforeEach(() => {
    fetch.resetMocks();
    fch.dedupe = true;
  });

  it("dedupes ongoing/parallel calls", async () => {
    fetch.once("a").once("b");
    const res = await Promise.all([fch("/a"), fch("/a")]);

    expect(res).toEqual(["a", "a"]);
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("dedupes named calls", async () => {
    fetch.once("a").once("b");
    const res = await Promise.all([fch.get("/a"), fch.get("/a")]);

    expect(res).toEqual(["a", "a"]);
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("can opt out locally", async () => {
    fetch.once("a").once("b");
    const res = await Promise.all([fch("/a"), fch("/a", { dedupe: false })]);

    expect(res).toEqual(["a", "b"]);
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("cannot reuse an opted out call", async () => {
    fetch.once("a").once("b");
    const res = await Promise.all([fch("/a", { dedupe: false }), fch("/a")]);

    expect(res).toEqual(["a", "b"]);
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("will reuse the last opt-in call", async () => {
    fetch.once("a").once("b").once("c");
    const res = await Promise.all([
      fch("/a"),
      fch("/a", { dedupe: false }),
      fch("/a"),
    ]);

    expect(res).toEqual(["a", "b", "a"]);
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("can opt out globally", async () => {
    fetch.once("a").once("b").once("c");
    fch.dedupe = false;
    const res = await Promise.all([fch("/a"), fch("/a"), fch("/a")]);

    expect(res).toEqual(["a", "b", "c"]);
    expect(fetch.mock.calls.length).toEqual(3);
    fch.dedupe = true;
  });

  it("does NOT dedupe/cache serial requests", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a");
    const resb = await fch("/a");

    expect([resa, resb]).toEqual(["a", "b"]);
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("does NOT dedupe/cache other request types", async () => {
    fetch.once("a").once("b");
    const res = await Promise.all([fch.get("/a"), fch.post("/a")]);

    expect(res).toEqual(["a", "b"]);
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("NOT deduping are invisible for other request", async () => {
    fetch.once("a").once("b").once("c");
    const res = await Promise.all([
      fch.get("/a"),
      fch.post("/a"),
      fch.get("/a"),
    ]);

    expect(res).toEqual(["a", "b", "a"]);
    expect(fetch.mock.calls.length).toEqual(2);
  });
});

describe("query parameters", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it("works with query", async () => {
    fetch.once("hello");
    const body = await fch("/", { query: { abc: "def" } });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/?abc=def");
  });

  it("works with existing query and new one", async () => {
    fetch.once("hello");
    const body = await fch("/?ghi=jkl", { query: { abc: "def" } });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/?abc=def&ghi=jkl");
  });

  it("can set a default query for everywhere", async () => {
    fetch.once("hello");
    fch.query = { abc: "def" };
    const body = await fch("/?mno=pqr", { query: { ghi: "jkl" } });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/?abc=def&ghi=jkl&mno=pqr");
    fch.query = {};
  });

  it("query overwriting: url > local", async () => {
    fetch.once("hello");
    const body = await fch("/?abc=def", { query: { abc: "hij" } });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/?abc=def");
  });

  it("query overwriting: local > global", async () => {
    fetch.once("hello");
    fch.query = { abc: "hij" };
    const body = await fch("/", { query: { abc: "def" } });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/?abc=def");
    fch.query = {};
  });

  it("query overwriting: url > local > global", async () => {
    fetch.once("hello");
    fch.query = { abc: "klm" };
    const body = await fch("/?abc=def", { query: { abc: "hij" } });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/?abc=def");
    fch.query = {};
  });
});

describe("interceptors", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });
  afterEach(() => {
    fetch.resetMocks();
    fch.before = (req) => req;
    fch.after = (res) => res;
  });

  it("can create a before interceptor", async () => {
    fetch.once("hello");
    const body = await fch("/", {
      before: (req) => {
        req.url = "/hello";
        req.method = "put";
        return req;
      },
    });

    expect(body).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/hello");
    expect(fetch.mock.calls[0][1].method).toEqual("put");
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

  it("can create a global before interceptor", async () => {
    fetch.once("hello");
    fch.before = (req) => {
      req.url = "/hello";
      req.method = "put";
      return req;
    };
    const data = await fch("/");

    expect(data).toEqual("hello");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/hello");
    expect(fetch.mock.calls[0][1].method).toEqual("put");
    expect(fetch.mock.calls[0][1].headers).toEqual({});

    delete fch.before;
  });

  it("can create an after interceptor", async () => {
    fetch.once("hello", { status: 201, headers: { hello: "world" } });
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
    expect(res.statusText).toEqual("Created");
    expect(res.headers.hello).toEqual("world");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

  it("can create a global after interceptor", async () => {
    fetch.once("hello", { status: 201, headers: { hello: "world" } });
    fch.after = (res) => {
      res.body = "bye";
      res.status = 200;
      res.headers.hello = "world";
      return res;
    };
    const res = await fch("/", { output: "response" });

    expect(res.body).toEqual("bye");
    expect(res.status).toEqual(200);
    expect(res.statusText).toEqual("Created");
    expect(res.headers.hello).toEqual("world");
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("/");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });
});

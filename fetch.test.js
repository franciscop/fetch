import fch from "./fetch.js";
import mock from "jest-fetch-mock";

mock.enableMocks();

const jsonHeaders = { headers: { "Content-Type": "application/json" } };

describe("fetch()", () => {
  beforeEach(() => {
    fetch.resetMocks();
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

  it("works with JSON", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const body = await fch("https://google.com/");

    expect(body).toEqual({ secret: "12345" });
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual("https://google.com/");
  });

  it("can use the swear interface", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const hello = await fch("/").secret;
    expect(hello).toEqual("12345");
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

  it("can use the `fetch.get()` shorthand", async () => {
    fetch.once("my-data");
    const body = await fch.get("/");
    expect(body).toBe("my-data");
    expect(fetch.mock.calls[0][1].method).toEqual("get");
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

  it("can use the `fetch.del()` shorthand", async () => {
    fetch.once("my-data");
    expect(await fch.del("/")).toBe("my-data");
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
      body: { a: "b" },
      headers: { "Content-Type": "xxx" },
    });

    expect(res).toEqual({ secret: "12345" });
    expect(fetch.mock.calls.length).toEqual(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toEqual("/");
    expect(opts).toMatchObject({
      method: "post",
      body: { a: "b" },
      headers: { "content-type": "xxx" },
    });
  });

  it("will send JSON", async () => {
    fetch.once(JSON.stringify({ secret: "12345" }), jsonHeaders);
    const res = await fch("/", { method: "POST", body: { a: "b" } });

    expect(res).toEqual({ secret: "12345" });
    expect(fetch.mock.calls.length).toEqual(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toEqual("/");
    expect(opts).toMatchObject({
      method: "post",
      body: '{"a":"b"}',
      headers: { "content-type": "application/json; charset=utf-8" },
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
      message: `options.output needs to be either "body" (default) or "response", not "abc"`,
    });
  });

  it("can accept rejections", async () => {
    fetch.mockRejectOnce(new Error("fake error message"));
    await expect(fch("/error")).rejects.toMatchObject({
      message: "fake error message",
    });
  });
});

describe("interceptors", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });
  afterEach(() => {
    fetch.resetMocks();
    delete fch.before;
    delete fch.after;
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

describe("dedupe network calls", () => {
  beforeEach(() => {
    fetch.resetMocks();
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

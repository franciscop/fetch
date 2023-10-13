import mock from "jest-fetch-mock";

import fch from "./index.js";

mock.enableMocks();

const delay = (num) => new Promise((done) => setTimeout(done, num));

describe.skip("default does not cache", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it("does not use cache by default", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a");
    const resb = await fch("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });
});

describe.skip("cache on the global object", () => {
  beforeEach(() => {
    fetch.resetMocks();
    fch.cache.expire = 2;
    fch.cache.clear();
  });

  it("uses cache", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a");
    const resb = await fch("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("uses cache with fch.get", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a");
    const resb = await fch.get("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("skips cache if too short", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a", { cache: 2 });
    await delay(2100);
    const resb = await fch("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short expire", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a", { cache: { expire: 2 } });
    await delay(2100);
    const resb = await fch("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short with a string", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a", { cache: "2000ms" });
    await delay(2100);
    const resb = await fch("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short expire with a string", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a", { cache: { expire: "2000ms" } });
    await delay(2100);
    const resb = await fch("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache when using different methods", async () => {
    fetch.once("a").once("b");
    const resa = await fch.post("/a");
    const resb = await fch.post("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("uses cache when shouldCache returns true", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a", {
      cache: { shouldCache: () => true },
    });
    const resb = await fch("/a", {
      cache: { shouldCache: () => true },
    });

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("skips cache when shouldCache returns false", async () => {
    fetch.once("a").once("b");
    const resa = await fch.post("/a", null, {
      cache: { shouldCache: () => false },
    });
    const resb = await fch.post("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache when removed manually", async () => {
    fetch.once("a").once("b");
    const resa = await fch("/a");
    await fch.cache.store.del("get:/a");
    const resb = await fch("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });
});

describe.skip("cache on an instance", () => {
  const api = fch.create({ cache: 60 * 60 });

  beforeAll(() => {
    delete fch.cache.shouldCache;
  });
  beforeEach(() => {
    fetch.resetMocks();
    api.cache.clear();
  });

  it("uses cache", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a");
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("uses cache with api.get", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a");
    const resb = await api.get("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("skips cache if too short", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a", { cache: 2 });
    await delay(2100);
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short expire", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a", { cache: { expire: 2 } });
    await delay(2100);
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short with a string", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a", { cache: "2000ms" });
    await delay(2100);
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short expire with a string", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a", { cache: { expire: "2000ms" } });
    await delay(2100);
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short number", async () => {
    const api = fch.create({ cache: 2 });
    fetch.once("a").once("b");
    const resa = await api("/a");
    await delay(2100);
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache if too short 'expire'", async () => {
    const api = fch.create({ cache: { expire: 2 } });
    fetch.once("a").once("b");
    const resa = await api("/a");
    await delay(2100);
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache when using different methods", async () => {
    fetch.once("a").once("b");
    const resa = await api.post("/a");
    const resb = await api.post("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("uses cache when shouldCache returns true", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a", {
      cache: { shouldCache: () => true },
    });
    const resb = await api("/a", {
      cache: { shouldCache: () => true },
    });

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("skips cache when shouldCache returns false", async () => {
    fetch.once("a").once("b");
    const resa = await api.post("/a", null, {
      cache: { shouldCache: () => false },
    });
    const resb = await api.post("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });

  it("skips cache when removed manually", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a");
    await api.cache.store.del("get:/a");
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetch.mock.calls.length).toEqual(2);
  });
});

describe.skip("cache+interceptors", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it("can cache a simple after interceptor", async () => {
    let count = 0;
    const api = fch.create({
      cache: 1,
      after: (res) => {
        count++;
        res.body = res.body + res.body;
        return res;
      },
    });
    fetch.once("a").once("b");
    const resa = await api("/a");
    const resb = await api("/a");

    expect(resa).toEqual("aa");
    expect(resb).toEqual("aa");
    expect(count).toBe(1);
    expect(fetch.mock.calls.length).toEqual(1);
  });

  it("calls the interceptor again if cache expired", async () => {
    let count = 0;
    const api = fch.create({
      cache: "1s",
      after: (res) => {
        count++;
        res.body = res.body + res.body;
        return res;
      },
    });
    fetch.once("a").once("b");
    const resa = await api("/a");
    await delay(1100);
    const resb = await api("/a");

    expect(resa).toEqual("aa");
    expect(resb).toEqual("bb");
    expect(count).toBe(2);
    expect(fetch.mock.calls.length).toEqual(2);
  });
});

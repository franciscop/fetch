import mock from "jest-fetch-mock";
import createCache from "./store.js";

mock.enableMocks();

const delay = (num) => new Promise((done) => setTimeout(done, num));

describe("raw cache store", () => {
  it("can set some cache", async () => {
    const cache = createCache({ expire: 1 });
    expect(await cache.get("hello")).toBe(null);
    await cache.set("hello", "world");
    expect(await cache.get("hello")).toBe("world");
  });
  it("can get the keys", async () => {
    const cache = createCache({ expire: 1 });
    expect(await cache.get("hello")).toBe(null);
    await cache.set("hello", "world");
    await cache.set("bye", "world");
    expect(await cache.keys()).toEqual(["hello", "bye"]);
  });
  it("can expire the cache globally", async () => {
    const cache = createCache({ expire: 1 });
    expect(await cache.get("hello")).toBe(null);
    await cache.set("hello", "world");
    expect(await cache.get("hello")).toBe("world");
    await delay(1200);
    expect(await cache.get("hello")).toBe(null);
  });
  it("can expire the cache locally", async () => {
    const cache = createCache({ expire: 1 });
    expect(await cache.get("hello")).toBe(null);
    await cache.set("hello", "world", { expire: 1 });
    expect(await cache.get("hello")).toBe("world");
    await delay(1200);
    expect(await cache.get("hello")).toBe(null);
  });
  it.skip("can cache an ongoing request", async () => {
    const cache = createCache({ expire: 1 });
    expect(await cache.get("hello")).toBe(null);
    await cache.set("hello", (async () => delay(100).then(() => "world"))());
    expect(await cache.get("hello")).toBe("world");
    expect(await cache.get("hello")).toBe("world");
  });
});

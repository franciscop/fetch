import fch from "./index.js";
import mock from "jest-fetch-mock";
import { createClient } from "redis";

mock.enableMocks();

const delay = (num) => new Promise((done) => setTimeout(done, num));

describe("redis cache client", () => {
  const api = fch.create({
    cache: {
      expire: 1,
      store: createClient(),
    },
  });
  beforeAll(async () => {
    // Expires in seconds, very low for testing
    await api.cache.store.connect();
  });
  afterAll(async () => {
    await api.cache.store.disconnect();
  });
  beforeEach(async () => {
    fetch.resetMocks();
    await api.cache.clear();
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

  it("skips cache if too short ttl", async () => {
    fetch.once("a").once("b");
    const resa = await api("/a", { cache: { expire: 2 } });
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
});

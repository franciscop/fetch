import { beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import kv from "polystore";

import fch from "./index.js";

// Mock fetch globally
let fetchMock: any;
let fetchCalls: any[] = [];

function mockFetchOnce(response: any, init?: ResponseInit): any {
  if (init && typeof response === "string") {
    response = new Response(response, init);
  }

  const responses: any[] = [response];
  let callCount = 0;
  fetchCalls = [];
  fetchMock = (spyOn(global, "fetch") as any).mockImplementation(
    async (...args: any[]) => {
      fetchCalls.push(args);
      const resp = responses[callCount] || responses[responses.length - 1];
      callCount++;
      if (typeof resp === "function") {
        const result = await resp(...args);
        if (typeof result === "string") return new Response(result);
        return result;
      }
      if (typeof resp === "string") {
        return new Response(resp);
      }
      return resp;
    },
  );

  return {
    once(nextResponse: any, nextInit?: ResponseInit) {
      if (nextInit && typeof nextResponse === "string") {
        responses.push(new Response(nextResponse, nextInit));
      } else {
        responses.push(nextResponse);
      }
      return this;
    },
  };
}

const delay = (num: number): Promise<void> =>
  new Promise((done) => setTimeout(done, num));

describe("polystore cache client", () => {
  let api: any;
  beforeAll(() => {
    const cache = kv(new Map());
    api = fch.create({ cache });
  });
  beforeEach(async () => {
    if (fetchMock) {
      fetchMock.mockRestore();
    }
    fetchCalls = [];
    await api.cache.clear();
  });

  it("uses cache", async () => {
    mockFetchOnce("a").once("b");
    const resa = await api("/a");
    const resb = await api("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetchCalls.length).toEqual(1);
  });

  it("uses cache with api.get", async () => {
    mockFetchOnce("a").once("b");
    const resa = await api("/a");
    const resb = await api.get("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetchCalls.length).toEqual(1);
  });

  it("skips cache if too short", async () => {
    mockFetchOnce("a").once("b");
    const cache = kv(new Map()).expires("2ms");
    const shortApi = fch.create({ cache });
    const resa = await shortApi("/a");
    await delay(10);
    const resb = await shortApi("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetchCalls.length).toEqual(2);
  });

  it("skips cache if too short ttl", async () => {
    mockFetchOnce("a").once("b");
    const cache = kv(new Map()).expires("2ms");
    const shortApi = fch.create({ cache });
    const resa = await shortApi("/a");
    await delay(10);
    const resb = await shortApi("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetchCalls.length).toEqual(2);
  });

  it("skips cache when using different methods", async () => {
    mockFetchOnce("a").once("b");
    const resa = await api.post("/a");
    const resb = await api.post("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetchCalls.length).toEqual(2);
  });

  it("uses cache when shouldCache returns true", async () => {
    mockFetchOnce("a").once("b");
    const resa = await api("/a", {
      cache: { shouldCache: () => true },
    });
    const resb = await api("/a", {
      cache: { shouldCache: () => true },
    });

    expect(resa).toEqual("a");
    expect(resb).toEqual("a");
    expect(fetchCalls.length).toEqual(1);
  });

  it("skips cache when shouldCache returns false", async () => {
    mockFetchOnce("a").once("b");
    const resa = await api.post("/a", null, {
      cache: { shouldCache: () => false },
    });
    const resb = await api.post("/a");

    expect(resa).toEqual("a");
    expect(resb).toEqual("b");
    expect(fetchCalls.length).toEqual(2);
  });
});

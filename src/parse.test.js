import { parse } from "./";

describe("parse()", () => {
  it("parses basic values properly", () => {
    expect(parse()).toBe(0);
    expect(parse(0)).toBe(0);
    expect(parse(100)).toBe(100);
    expect(parse(false)).toBe(0);
    expect(parse(true)).toBe(3600 * 1000);
    expect(parse("1s")).toBe(1000);
  });
  it("a number is a number", () => {
    expect(parse(3456)).toBe(3456);
    expect(parse(3_456)).toBe(3456);
    expect(parse(34_56)).toBe(3456);
    expect(parse(3.456)).toBe(3.456);
  });
  it("can ignore commas and underscores", () => {
    expect(parse("10_000s")).toBe(parse("10000s"));
    expect(parse("10,000s")).toBe(parse("10000s"));
  });
  it("can work with different units", () => {
    expect(parse("1s")).toBe(parse("1000ms"));
    expect(parse("1d")).toBe(parse("24h"));
    expect(parse("1w")).toBe(parse("7d"));
    expect(parse("1second")).toBe(parse("1000milliseconds"));
    expect(parse("1day")).toBe(parse("24hours"));
    expect(parse("1week")).toBe(parse("7days"));
  });
});

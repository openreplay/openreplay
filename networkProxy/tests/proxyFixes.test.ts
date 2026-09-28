import { describe, it, expect, vi } from "vitest";
import FetchProxy from "../src/fetchProxy";
import { XHRProxyHandler } from "../src/xhrProxy";
import { genStringBody } from "../src/utils";

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const noToken = () => {};
const identity = (x: any) => x;

describe("fetch proxy fixes", () => {
  it("captures fetch(new URL(...))", async () => {
    const sendMessage = vi.fn();
    const target = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any);
    await wrapped(new URL("https://api.example.com/items?a=1"));
    await flush();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0].url).toBe("https://api.example.com/items?a=1");
  });

  it("returns the real Response, not a Proxy", async () => {
    const response = new Response('{"a":1}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const target = vi.fn().mockResolvedValue(response);
    const wrapped = FetchProxy.create(false, noToken, identity, vi.fn(), () => false, undefined, target as any);
    const resp = await wrapped("https://api.example.com/a");
    expect(resp).toBe(response);
    expect(await resp.json()).toEqual({ a: 1 });
  });

  it("calls the given fetch with the given context as receiver", async () => {
    const context = { location: { href: "https://frame.example.com/embed/" } } as any;
    let receiver: unknown;
    const target = vi.fn(function (this: unknown) {
      receiver = this;
      return Promise.resolve(new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }));
    });
    const sendMessage = vi.fn();
    const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any, context);
    await wrapped("data.json");
    await flush();
    expect(receiver).toBe(context);
    expect(sendMessage.mock.calls[0][0].url).toBe("https://frame.example.com/embed/data.json");
  });
});

describe("xhr proxy fixes", () => {
  function makeHandler(sendMessage: (m: any) => void) {
    const req: any = { readyState: 0, status: 0, responseType: "", response: "" };
    const handler = new XHRProxyHandler(req, false, noToken, identity, sendMessage, () => false);
    handler.item.url = "https://api.example.com/x";
    handler.item.method = "GET";
    return { req, handler };
  }

  it("reports an aborted request once", async () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn();
    const { req, handler } = makeHandler(sendMessage);
    req.readyState = 4;
    handler.onReadyStateChange();
    handler.onAbort();
    vi.runAllTimers();
    vi.useRealTimers();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("still reports a failed (status 0) request without abort", () => {
    vi.useFakeTimers();
    const sendMessage = vi.fn();
    const { req, handler } = makeHandler(sendMessage);
    req.readyState = 4;
    handler.onReadyStateChange();
    vi.runAllTimers();
    vi.useRealTimers();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe("genStringBody", () => {
  it("keeps JSON bodies that contain '&'", () => {
    expect(genStringBody('{"q":"a&b"}')).toBe('{"q":"a&b"}');
    expect(genStringBody("a=1&b=2")).toBe("a=1,b=2");
  });
});

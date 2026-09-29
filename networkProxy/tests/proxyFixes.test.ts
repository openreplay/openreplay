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

  const token = (cb: (n: string, v: string) => void) => cb("X-OpenReplay-SessionToken", "t");
  const makeRequest = () =>
    new Request("https://api.example.com/a", {
      method: "POST",
      headers: { Authorization: "Bearer app", "Content-Type": "application/json" },
      body: '{"a":1}',
    });

  it("keeps the Request's headers when init has none", async () => {
    let sent: Headers | undefined;
    const target = vi.fn((input: Request, init?: RequestInit) => {
      // fetch semantics: init.headers, when present, replaces the Request's headers
      sent = init?.headers !== undefined ? new Headers(init.headers) : input.headers;
      return Promise.resolve(new Response("{}", { headers: { "content-type": "application/json" } }));
    });
    const wrapped = FetchProxy.create(false, token, identity, vi.fn(), () => false, undefined, target as any);
    await wrapped(makeRequest(), { signal: new AbortController().signal });
    expect(sent!.get("authorization")).toBe("Bearer app");
    expect(sent!.get("content-type")).toBe("application/json");
    expect(sent!.get("x-openreplay-sessiontoken")).toBe("t");
  });

  it("records the body of a Request input and leaves it readable for fetch", async () => {
    const sendMessage = vi.fn();
    let sentBody = "";
    const target = vi.fn(async (input: Request) => {
      sentBody = await input.text();
      return new Response("{}", { headers: { "content-type": "application/json" } });
    });
    const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any);
    await wrapped(makeRequest());
    await flush();
    expect(sentBody).toBe('{"a":1}');
    expect(JSON.parse(sendMessage.mock.calls[0][0].request).body).toBe('{"a":1}');
  });

  it.each([
    ["application/problem+json", '{"title":"bad"}'],
    ["application/xml", "<a/>"],
    [null, "boom"],
  ])("keeps text bodies of %s responses", async (contentType, body) => {
    const sendMessage = vi.fn();
    const target = vi.fn().mockResolvedValue(
      // a byte body keeps Response from adding text/plain
      new Response(contentType ? body : new TextEncoder().encode(body), {
        status: 500,
        headers: contentType ? { "content-type": contentType } : {},
      }),
    );
    const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any);
    await wrapped("https://api.example.com/a");
    await flush();
    expect(JSON.parse(sendMessage.mock.calls[0][0].response).body).toBe(body);
  });

  it("records an event stream without waiting for it to end", async () => {
    const sendMessage = vi.fn();
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("data: 1\n\n")) } });
    const target = vi.fn().mockResolvedValue(
      new Response(stream, { headers: { "content-type": "text/event-stream" } }),
    );
    const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any);
    await wrapped("https://api.example.com/sse");
    await flush();
    expect(sendMessage).toHaveBeenCalledTimes(1);
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

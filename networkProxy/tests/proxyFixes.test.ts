import { describe, it, expect, vi } from "vitest";
import FetchProxy from "../src/fetchProxy";
import XHRProxy from "../src/xhrProxy";
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

  /** A body that never ends; `cancelled` flips once every reader of it let go. */
  function endless(chunk = 64 * 1024) {
    const state = { pulled: 0, cancelled: false };
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        state.pulled += chunk;
        c.enqueue(new Uint8Array(chunk).fill(97));
      },
      cancel() {
        state.cancelled = true;
      },
    });
    return { stream, state };
  }
  const settle = () => new Promise((r) => setTimeout(r, 20));

  it.each(["text/plain", "application/json", "text/event-stream", "application/x-ndjson", "application/octet-stream", "multipart/x-mixed-replace"])(
    "records a %s response that never ends, and lets the app close it",
    async (contentType) => {
      const sendMessage = vi.fn();
      const { stream, state } = endless();
      const target = vi.fn().mockResolvedValue(new Response(stream, { headers: { "content-type": contentType } }));
      const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any);
      const resp = await wrapped("https://api.example.com/tail");
      await settle();
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(JSON.parse(sendMessage.mock.calls[0][0].response).body).toBeFalsy();
      // the tracker holds at most about one limit's worth of it
      expect(state.pulled).toBeLessThan(1_200_000);
      await resp.body!.cancel();
      expect(state.cancelled).toBe(true);
    },
  );

  it("sizes a binary response by its content-length without reading it", async () => {
    const sendMessage = vi.fn();
    const { stream, state } = endless();
    const target = vi.fn().mockResolvedValue(
      new Response(stream, { headers: { "content-type": "image/png", "content-length": "2048" } }),
    );
    const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any);
    const resp = await wrapped("https://api.example.com/a.png");
    await settle();
    expect(sendMessage.mock.calls[0][0].responseSize).toBe(2048);
    expect(state.pulled).toBeLessThanOrEqual(64 * 1024);
    await resp.body!.cancel();
    expect(state.cancelled).toBe(true);
  });

  it("records an endless upload stream without holding all of it", async () => {
    const sendMessage = vi.fn();
    const { stream, state } = endless();
    const request = new Request("https://api.example.com/upload", {
      method: "POST",
      body: stream,
      headers: { "content-type": "text/plain" },
      // @ts-ignore not in the dom lib yet
      duplex: "half",
    });
    const target = vi.fn().mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } }));
    const wrapped = FetchProxy.create(false, noToken, identity, sendMessage, () => false, undefined, target as any);
    await wrapped(request);
    await settle();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendMessage.mock.calls[0][0].request).body).toBeFalsy();
    expect(state.pulled).toBeLessThan(1_200_000);
  });
});

describe("xhr proxy fixes", () => {
  // events in the order the XHR spec fires them, handler attributes first
  class FakeXHR extends EventTarget {
    readyState = 0;
    status = 0;
    responseType = "";
    response: any = "";
    onreadystatechange: any = null;
    onabort: any = null;
    ontimeout: any = null;
    onerror: any = null;
    private active = false;
    open() {
      this.active = false;
      this.readyState = 1;
      this.status = 0;
      this.response = "";
      this.fire("readystatechange");
    }
    setRequestHeader() {}
    getAllResponseHeaders() {
      return "content-type: application/json\r\n";
    }
    send() {
      this.active = true;
    }
    abort() {
      if (this.active) this.end("abort");
      if (this.readyState === 4) this.readyState = 0;
    }
    respond(status: number, body: string) {
      this.status = status;
      this.readyState = 2;
      this.fire("readystatechange");
      this.readyState = 3;
      this.fire("readystatechange");
      this.response = body;
      this.end("load");
    }
    end(type: "load" | "error" | "abort" | "timeout") {
      this.active = false;
      if (type !== "load") this.status = 0;
      this.readyState = 4;
      this.fire("readystatechange");
      this.fire(type);
      this.fire("loadend");
    }
    private fire(type: string) {
      const e = new Event(type);
      (this as any)["on" + type]?.call(this, e);
      this.dispatchEvent(e);
    }
  }

  function makeXHR() {
    const sendMessage = vi.fn();
    const Wrapped = XHRProxy.create(false, noToken, identity, sendMessage, (u) => u.includes("/ingest"), undefined, FakeXHR as any);
    const xhr = new Wrapped() as unknown as FakeXHR & XMLHttpRequest;
    const sent = () => sendMessage.mock.calls.map(([m]) => ({ url: m.url, status: m.status, request: JSON.parse(m.request) }));
    return { xhr, sent };
  }

  it("records each request of a reused XHR once, with its own data", () => {
    vi.useFakeTimers();
    const { xhr, sent } = makeXHR();
    xhr.open("POST", "https://api.example.com/a");
    xhr.setRequestHeader("X-First", "1");
    xhr.send('{"q":"a"}');
    xhr.abort();
    xhr.open("GET", "https://api.example.com/b");
    xhr.send();
    xhr.respond(200, '{"ok":true}');
    vi.runAllTimers();
    vi.useRealTimers();
    const msgs = sent();
    expect(msgs.map((m) => [m.url, m.status])).toEqual([
      ["https://api.example.com/a", 0],
      ["https://api.example.com/b", 200],
    ]);
    expect(msgs[1].request.headers).toEqual({});
  });

  it.each(["error", "abort", "timeout"] as const)("records a request retried from on%s once", (type) => {
    const { xhr, sent } = makeXHR();
    (xhr as any)["on" + type] = () => {
      xhr.open("GET", "https://api.example.com/retry");
      xhr.send();
    };
    xhr.open("GET", "https://api.example.com/first");
    xhr.send();
    xhr.end(type);
    xhr.respond(200, "{}");
    expect(sent().map((m) => [m.url, m.status])).toEqual([
      ["https://api.example.com/first", 0],
      ["https://api.example.com/retry", 200],
    ]);
  });

  it("records a request dropped by open() without events", () => {
    const { xhr, sent } = makeXHR();
    xhr.open("GET", "https://api.example.com/slow");
    xhr.send();
    xhr.open("GET", "https://api.example.com/next");
    expect(sent().map((m) => m.url)).toEqual(["https://api.example.com/slow"]);
  });

  it("skips service urls", () => {
    const { xhr, sent } = makeXHR();
    xhr.open("POST", "https://or.example.com/ingest/v1/web/i");
    xhr.send();
    xhr.abort();
    expect(sent()).toEqual([]);
  });
});

describe("genStringBody", () => {
  it("keeps JSON bodies that contain '&'", () => {
    expect(genStringBody('{"q":"a&b"}')).toBe('{"q":"a&b"}');
    expect(genStringBody("a=1&b=2")).toBe("a=1,b=2");
  });
});

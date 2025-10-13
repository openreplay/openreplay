import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};


vi.mock("./utils", () => {
  return {
    formatByteSize: (n: number) => `${n}B`,
    genStringBody: (b: any) => (typeof b === "string" ? b : "[non-string-body]"),
    getStringResponseByType: (_t: any, v: any) =>
      typeof v === "string" ? v : JSON.stringify(v),
    getURL: (u: string) => new URL(u, "http://example.test"),
  };
});

import FetchProxy from "../src/fetchProxy";

describe("FetchProxy", () => {
  const realFetch = globalThis.fetch;
  const sendMessage = vi.fn();
  const sanitize = vi.fn((x) => x);
  const setSessionTokenHeader = (cb: (n: string, v: string) => void) => cb("x-session", "tok");
  const isServiceUrl = (url: string) => url.includes("openreplay.internal");
  const tokenUrlMatcher = (url: string) => url.includes("/needs-token");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockImplementation(
      (() => {
        let t = 0;
        return () => (t += 10);
      })(),
    );
    (globalThis as any).fetch = vi.fn();
    sendMessage.mockReset();
    sanitize.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    (performance.now as any).mockRestore?.();
    (globalThis as any).fetch = realFetch;
  });

  it("passes through service URLs without interception", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    (globalThis.fetch as any).mockResolvedValue(response);

    const wrapped = FetchProxy.create(
      false,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher,
    );

    const res = await wrapped("https://openreplay.internal/ping", {}).then((r) => r.json());

    expect(res).toEqual({ ok: true });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("records a successful JSON response and proxies response methods", async () => {
    const body = { hello: "world" };
    const response = new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    (globalThis.fetch as any).mockResolvedValue(response);

    const wrapped = FetchProxy.create(
      false,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      () => false,
      tokenUrlMatcher,
    );

    const res = await wrapped("https://api.example.com/data", {});
    const json = await res.json();
    expect(json).toEqual(body);
    await flushPromises(); // wait for sendMessage

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const msg = sendMessage.mock.calls[0][0];

    expect(msg.status).toBe(200);
    // [modified] parse message.response (stringified {headers, body}) and assert its body
    const parsedResp = JSON.parse(msg.response);
    expect(parsedResp.body).toContain('"hello":"world"');
  });

  it("injects session header when tokenUrlMatcher matches", async () => {
    const response = new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });

    (globalThis.fetch as any).mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      if (input instanceof Request) {
        expect(input.headers.get("x-session")).toBe("tok");
      } else {
        const headers = new Headers(init?.headers as any);
        expect(headers.get("x-session")).toBe("tok");
      }
      return response;
    });

    const wrapped = FetchProxy.create(
      false,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      () => false,
      tokenUrlMatcher,
    );

    await wrapped("https://api.example.com/needs-token", {});
    await flushPromises();

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("does not inject session header when tokenUrlMatcher does not match", async () => {
    const response = new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });

    (globalThis.fetch as any).mockImplementation(async (_input: RequestInfo, init?: RequestInit) => {
      const headers = new Headers(init?.headers as any);
      expect(headers.get("x-session")).toBeNull();
      return response;
    });

    const wrapped = FetchProxy.create(
      false,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      () => false,
      tokenUrlMatcher,
    );

    await wrapped("https://api.example.com/other", {});
    await flushPromises();

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("handles AbortController: records aborted and rethrows AbortError", async () => {
    const controller = new AbortController();
    (globalThis.fetch as any).mockImplementation(
      (_input: RequestInfo, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new DOMException("The operation was aborted.", "AbortError");
            reject(err);
          });
        }),
    );

    const wrapped = FetchProxy.create(
      false,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      () => false,
      tokenUrlMatcher,
    );

    const p = wrapped("https://api.example.com/slow", { signal: controller.signal });
    controller.abort();

    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    await flushPromises();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const msg = sendMessage.mock.calls[0][0];

    expect(msg.status).toBe(0);
  });

  it("reads arrayBuffer for non-text content", async () => {
    const payload = new Uint8Array([1, 2, 3]).buffer;
    const response = new Response(payload, {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    });
    (globalThis.fetch as any).mockResolvedValue(response);

    const wrapped = FetchProxy.create(
      false,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      () => false,
      tokenUrlMatcher,
    );

    const res = await wrapped("https://api.example.com/bin", {});
    await res.arrayBuffer();
    await flushPromises();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const msg = sendMessage.mock.calls[0][0];

    expect(msg.status).toBe(200);
    expect(msg.responseSize).toBe(3);
  });

  it("does not clone for chunked responses and still returns the Response", async () => {
    const response = new Response("streaming", {
      status: 200,
      headers: {
        "content-type": "text/plain",
        "transfer-encoding": "chunked",
      },
    });
    const cloneSpy = vi.spyOn(Response.prototype, "clone");
    (globalThis.fetch as any).mockResolvedValue(response);

    const wrapped = FetchProxy.create(
      false,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      () => false,
      tokenUrlMatcher,
    );

    const resp = await wrapped("https://api.example.com/stream", {});
    expect(resp).toBeInstanceOf(Response);
    expect(cloneSpy).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    cloneSpy.mockRestore();
  });
});

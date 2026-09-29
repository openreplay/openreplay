import { describe, it, expect, vi } from "vitest";
import hookAxios from "../src/axiosHook";
import { proxiedRequests } from "../src/proxied";

// just enough of axios: request interceptors, one adapter call, response interceptors
function fakeAxios(adapter: (config: any) => Promise<any>) {
  const req: any[] = [];
  const res: any[] = [];
  const instance = {
    interceptors: {
      request: { use: (ok: any, fail?: any) => req.push([ok, fail]) },
      response: { use: (ok: any, fail?: any) => res.push([ok, fail]) },
    },
    getUri: (c: any) => (c.baseURL || "") + c.url,
    async request(config: any) {
      for (const [ok] of req) config = ok(config);
      let p = adapter(config);
      for (const [ok, fail] of res) p = p.then(ok, fail);
      return p;
    },
  };
  return instance;
}

const identity = (x: any) => x;
const token = (cb: (n: string, v: string) => void) => cb("X-OpenReplay-SessionToken", "t");

function hook(instance: any, sendMessage = vi.fn(), setToken: any = () => {}) {
  hookAxios(instance, ["authorization"], setToken, identity, sendMessage, (u) => u.includes("/ingest"));
  return sendMessage;
}

describe("axios hook", () => {
  it("records a request of a custom adapter", async () => {
    const api = fakeAxios(async (config) => ({
      config,
      status: 201,
      headers: { "content-type": "application/json" },
      data: { id: 1 },
      request: undefined,
    }));
    const sendMessage = hook(api);
    await api.request({
      baseURL: "https://api.example.com",
      url: "/items?a=1",
      method: "post",
      headers: { Authorization: "Bearer x", "X-Foo": "y" },
      data: '{"b":2}',
    });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const msg = sendMessage.mock.calls[0][0];
    expect(msg.method).toBe("POST");
    expect(msg.url).toBe("https://api.example.com/items?a=1");
    expect(msg.status).toBe(201);
    const request = JSON.parse(msg.request);
    expect(request.headers).toEqual({ "X-Foo": "y" });
    expect(request.body).toBe('{"b":2}');
    expect(JSON.parse(msg.response).body).toBe('{"id":1}');
  });

  it("skips requests the proxies handled", async () => {
    const xhr = {};
    proxiedRequests.add(xhr);
    const api = fakeAxios(async (config) => ({ config, status: 200, headers: {}, data: "", request: xhr }));
    const sendMessage = hook(api);
    await api.request({ url: "https://api.example.com/a", method: "get", headers: {} });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("records a failed response and rethrows", async () => {
    const api = fakeAxios(async (config) => {
      throw { config, response: { config, status: 503, headers: {}, data: "down" } };
    });
    const sendMessage = hook(api);
    await expect(api.request({ url: "https://api.example.com/a", method: "get", headers: {} })).rejects.toBeTruthy();
    expect(sendMessage.mock.calls[0][0].status).toBe(503);
  });

  it("sets the session token on AxiosHeaders-like and plain headers", async () => {
    const seen: any[] = [];
    const api = fakeAxios(async (config) => {
      seen.push(config.headers);
      return { config, status: 200, headers: {}, data: "" };
    });
    hook(api, vi.fn(), token);
    const set = vi.fn();
    await api.request({ url: "https://api.example.com/a", headers: { set, toJSON: () => ({}) } });
    await api.request({ url: "https://api.example.com/b", headers: { "X-Foo": "y" } });
    expect(set).toHaveBeenCalledWith("X-OpenReplay-SessionToken", "t");
    expect(seen[1]).toEqual({ "X-Foo": "y", "X-OpenReplay-SessionToken": "t" });
  });

  it("ignores service urls", async () => {
    const api = fakeAxios(async (config) => ({ config, status: 200, headers: {}, data: "" }));
    const sendMessage = hook(api);
    await api.request({ url: "https://or.example.com/ingest/v1/web/i", headers: {} });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

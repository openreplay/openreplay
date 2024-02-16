import { App, Messages } from '@openreplay/tracker';
import type { Middleware, RelayRequest } from './relaytypes';

const createRelayMiddleware = (app: App | null): Middleware => {
  if (!app) {
    return (next) => async (req) => await next(req);
  }
  return (next) => async (req) => {
    const start = app.timestamp();
    const resp = await next(req)
    const end = app.timestamp();
    if ('requests' in req) {
      req.requests.forEach((request) => {
        app.send(getMessage(request, resp.json as Record<string, any>, end - start))
      })
    } else {
      app.send(getMessage(req, resp.json as Record<string, any>, end - start))
    }
    return resp;
  }
};

function getMessage(request: RelayRequest, json: Record<string, any>, duration: number) {
  const opKind = request.operation.kind;
  const opName = request.operation.name;
  const vars = JSON.stringify(request.variables)
  const opResp = JSON.stringify(json)
  console.log('relay', opKind, opName, vars, opResp, duration)
  return Messages.GraphQL(
    opKind,
    opName,
    vars,
    opResp,
    // duration
  )
}

export default createRelayMiddleware

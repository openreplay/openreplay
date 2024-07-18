import { App, Messages } from '@openreplay/tracker';
import type { Middleware, RelayRequest } from './relaytypes';
import { Sanitizer } from './types';

const createRelayMiddleware = (sanitizer?: Sanitizer) => {
  return (app: App | null): Middleware => {
    if (!app) {
      return (next) => async (req) => await next(req);
    }
    return (next) => async (req) => {
      const start = app.timestamp();
      const resp = await next(req);
      const end = app.timestamp();
      if ('requests' in req) {
        req.requests.forEach((request) => {
          app.send(
            getMessage(
              request,
              resp.json as Record<string, any>,
              end - start,
              sanitizer,
            ),
          );
        });
      } else {
        app.send(
          getMessage(
            req,
            resp.json as Record<string, any>,
            end - start,
            sanitizer,
          ),
        );
      }
      return resp;
    };
  };
};

function getMessage(
  request: RelayRequest,
  json: Record<string, any>,
  duration: number,
  sanitizer?: Sanitizer,
) {
  const opKind = request.operation.kind;
  const opName = request.operation.name;
  const vars = JSON.stringify(
    sanitizer ? sanitizer(request.variables) : request.variables,
  );
  const opResp = JSON.stringify(sanitizer ? sanitizer(json) : json);
  return Messages.GraphQL(opKind, opName, vars, opResp, duration);
}

export default createRelayMiddleware;

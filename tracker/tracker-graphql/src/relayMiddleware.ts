import { App, Messages } from '@openreplay/tracker';
import type { Middleware, RelayRequest } from './relaytypes';
import { Sanitizer } from './types';
import Observable from 'zen-observable';

interface GraphQLOperation {
  name: string;
  operationKind: string;
  text?: string | null;
}

interface GraphQLVariables {
  [key: string]: any;
}

interface GraphQLCacheConfig {
  [key: string]: any;
}

interface FetchFunction {
  (
    operation: GraphQLOperation,
    variables: GraphQLVariables,
    cacheConfig: GraphQLCacheConfig,
    uploadables?: any
  ): Observable<unknown>;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    // If we can’t stringify (e.g., cyclic object), return a placeholder
    return '"[unserializable]"';
  }
}

function createRelayObserver(sanitizer?: Sanitizer<Record<string, any>>) {
  return (app: App | null) => {
    return (originalFetch: FetchFunction) => (operation: GraphQLOperation, variables: GraphQLVariables, cacheConfig: GraphQLCacheConfig, uploadables?: any): Observable<any> => {
      const startTime = Date.now();
      const observable = originalFetch(operation, variables, cacheConfig, uploadables);

      if (!app || !app.active()) {
        return observable;
      }

      return new Observable(observer =>
        observable.subscribe({
          next: (data: any) => {
            const duration = Date.now() - startTime;
            const opName = operation.name;
            const opKind = operation.operationKind;
            const vars = JSON.stringify(sanitizer ? sanitizer(variables) : variables);
            if (data.errors && data.errors.length > 0) {
              const opResp = safeStringify(sanitizer ? sanitizer(data.errors) : data.errors);
              app.send(Messages.GraphQL(
                opKind,
                `ERROR: ${opName}`,
                vars,
                opResp,
                duration
              ));
            } else {
              const opResp = safeStringify(sanitizer ? sanitizer(data) : data);
              app.send(Messages.GraphQL(
                opKind,
                opName,
                vars,
                opResp,
                duration
              ));
            }
            observer.next(data);
          },
          error: err => {
            const duration = Date.now() - startTime;
            const opName = 'ERROR: ' + operation.name;
            const opKind = operation.operationKind;
            const vars = safeStringify(sanitizer ? sanitizer(variables) : variables);
            const opResp = safeStringify(err);
            app.send(Messages.GraphQL(opKind, opName, vars, opResp, duration));
            observer.error(err);
          },
          complete: () => {
            observer.complete();
          }
        })
      )
    }
  }
}

const createRelayMiddleware = (sanitizer?: Sanitizer<Record<string, any>>) => {
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
  sanitizer?: Sanitizer<Record<string, any>>,
) {
  const opKind = request.operation.kind;
  const opName = request.operation.name;
  const vars = JSON.stringify(
    sanitizer ? sanitizer(request.variables) : request.variables,
  );
  const opResp = JSON.stringify(sanitizer ? sanitizer(json) : json);
  return Messages.GraphQL(opKind, opName, vars, opResp, duration);
}

export { createRelayMiddleware, createRelayObserver };

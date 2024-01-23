import { App, Messages } from '@openreplay/tracker';
import * as Observable from 'zen-observable';
import { Operation, NextLink } from '@apollo/client';

export const createTrackerLink = (app: App | null) => {
  if (!app) {
    return (operation: Operation, forward: NextLink) => forward(operation);
  }
  return (operation: Operation, forward: NextLink) => {
    return new Observable((observer) => {
      const start = app.timestamp();
      const observable = forward(operation);
      const subscription = observable.subscribe({
        next(value) {
          const end = app.timestamp();
          app.send(
            Messages.GraphQL(
              operation.query.definitions[0].kind,
              operation.operationName,
              JSON.stringify(operation.variables),
              JSON.stringify(value.data),
              end - start,
            ),
          );
          observer.next(value);
        },
        error(error) {
          const end = app.timestamp();
          app.send(
            Messages.GraphQL(
              operation.query.definitions[0].kind,
              operation.operationName,
              JSON.stringify(operation.variables),
              JSON.stringify(error),
              end - start,
            )
          )
          observer.error(error);
        },
        complete() {
          observer.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
  };
};

export default createTrackerLink
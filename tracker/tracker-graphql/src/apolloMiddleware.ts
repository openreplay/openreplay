import { App, Messages } from '@openreplay/tracker';
import Observable from 'zen-observable';

type Operation = {
  query: Record<string, any>;
  variables: Record<string, any>;
  operationName: string;
  extensions: Record<string, any>;
};
type NextLink = (operation: Operation) => Observable<Record<string, any>>;

export const createTrackerLink = (app: App | null) => {
  if (!app) {
    return (operation: Operation, forward: NextLink) => forward(operation);
  }
  return (operation: Operation, forward: NextLink) => {
    return new Observable((observer) => {
      const start = app.timestamp();
      console.log(operation, forward)
      const observable = forward(operation);
      const subscription = observable.subscribe({
        next(value) {
          const end = app.timestamp();
          console.log(
            'next',
            operation.query.definitions[0].kind,
            operation.operationName,
            JSON.stringify(operation.variables),
            JSON.stringify(value.data),
            end - start,
          );
          app.send(
            Messages.GraphQL(
              operation.query.definitions[0].kind,
              operation.operationName,
              JSON.stringify(operation.variables),
              JSON.stringify(value.data),
              // end - start,
            ),
          );
          observer.next(value);
        },
        error(error) {
          const end = app.timestamp();
          console.log('error', error, operation, end - start);
          app.send(
            Messages.GraphQL(
              operation.query.definitions[0].kind,
              operation.operationName,
              JSON.stringify(operation.variables),
              JSON.stringify(error),
              // end - start,
            ),
          );
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

export default createTrackerLink;

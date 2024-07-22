import { App, Messages } from '@openreplay/tracker';
import Observable from 'zen-observable';
import { Sanitizer } from './types';

type Operation = {
  query: Record<string, any>;
  variables: Record<string, any>;
  operationName: string;
  extensions: Record<string, any>;
};
type NextLink = (operation: Operation) => Observable<Record<string, any>>;

export const createTrackerLink = (
  sanitizer?: Sanitizer<Record<string, any> | undefined | null>,
) => {
  return (app: App | null) => {
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
            const operationDefinition = operation.query.definitions[0];
            app.send(
              Messages.GraphQL(
                operationDefinition.kind === 'OperationDefinition'
                  ? operationDefinition.operation
                  : 'unknown?',
                operation.operationName,
                JSON.stringify(
                  sanitizer
                    ? sanitizer(operation.variables)
                    : operation.variables,
                ),
                JSON.stringify(sanitizer ? sanitizer(value.data) : value.data),
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
                JSON.stringify(
                  sanitizer
                    ? sanitizer(operation.variables)
                    : operation.variables,
                ),
                JSON.stringify(error),
                end - start,
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
};

export default createTrackerLink;

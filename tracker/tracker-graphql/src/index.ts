import { App, Messages } from '@openreplay/tracker';

export default function() {
  return (app: App | null) => {
    if (app === null) {
      return (_1: string, _2: string, _3: any, result: any, _4: number) =>
        result;
    }
    return (
      operationKind: string,
      operationName: string,
      variables: any,
      result: any,
      duration: number,
    ) => {
      try {
        app.send(
          Messages.GraphQL(
            operationKind,
            operationName,
            JSON.stringify(variables),
            JSON.stringify(result),
            duration,
          ),
        );
      } finally {
        return result;
      }
    };
  };
}

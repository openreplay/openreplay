import { App, Messages } from "@openreplay/tracker";

function createGraphqlMiddleware() {
  return (app: App | null) => {
    if (app === null) {
      return (_1: string, _2: string, _3: any, result: any) => result;
    }
    return (
      operationKind: string,
      operationName: string,
      variables: any,
      result: any,
      duration = 0
    ) => {
      try {
        console.log('graphql', operationKind, operationName, variables, result, duration)
        app.send(
          Messages.GraphQL(
            operationKind,
            operationName,
            JSON.stringify(variables),
            JSON.stringify(result),
            // duration,
          ),
        );
      } catch (e) {
        console.error(e);
      }
      return result;
    };
  };
}

export default createGraphqlMiddleware
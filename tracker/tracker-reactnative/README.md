# @openreplay/react-native

Openreplay React-native connector for mobile applications.

## Installation

```sh
npm install @openreplay/react-native
```

Please see [the documentation](https://docs.openreplay.com/en/rn-sdk/) for more information about usage.

### React Native and GraphQL

You can use [@openreplay/tracker-graphql](https://www.npmjs.com/package/@openreplay/tracker-graphql) to handle graphql events in react-native applications as well, via

```js
import { createRelayMiddleware } from '@openreplay/tracker-graphql';

const appWrapper = {
  active: () => true,
  send: (gqlMsg) => {
    const type = 'gql';
    const msg = JSON.stringify({
      operationKind: gqlMsg[1],
      operationName: gqlMsg[2],
      variables: gqlMsg[3],
      response: gqlMsg[4],
      duration: gqlMsg[5],
    });
    Openreplay.sendCustomMessage(type, msg);
  },
};

// @ts-ignore - emulating web tracker here for middleware
const middleware = createRelayMiddleware(appWrapper);

// .. connect to relay network layer
```

# OpenReplay Tracker GraphQL plugin

This plugin allows you to capture the GraphQL requests and then search by them.

## Installation

```bash
npm i @openreplay/tracker-graphql
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
The `plugin` call will return the function, which receives four variables
`operationKind`, `operationName`, `variables`, `result` and `duration` (default 0)

returns `result` without changes.

```js
import Tracker from '@openreplay/tracker';
import trackerGraphQL from '@openreplay/tracker-graphql';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

export const recordGraphQL = tracker.plugin(trackerGraphQL());
```

### Relay

If you're using [Relay network tools](https://github.com/relay-tools/react-relay-network-modern),
you can simply [create a middleware](https://github.com/relay-tools/react-relay-network-modern/tree/master?tab=readme-ov-file#example-of-injecting-networklayer-with-middlewares-on-the-client-side)

```js
import { createRelayMiddleware } from '@openreplay/tracker-graphql'

const trackerMiddleware = createRelayMiddleware(tracker)

const network = new RelayNetworkLayer([
  // your middleware
  // ,
  trackerMiddleware
])
```

Or you can manually put `recordGraphQL` call
to the `NetworkLayer` implementation. If you are standard `Network.create` way to implement it,
then you should do something like below

```js
import { createGraphqlMiddleware } from '@openreplay/tracker-graphql'; // see above for recordGraphQL definition
import { Environment } from 'relay-runtime';

const handler = createGraphqlMiddleware(tracker)

function fetchQuery(operation, variables, cacheConfig, uploadables) {
  return fetch('www.myapi.com/resource', {
    // ...
  })
    .then(response => response.json())
    .then(result =>
        handler(
          // op kind, name, variables, response, duration (default 0)
          operation.operationKind,
          operation.name,
          variables,
          result,
          duration,
        ),
    );
}

const network = Network.create(fetchQuery);
```

See [Relay Network Layer](https://relay.dev/docs/en/network-layer) for details.

### Apollo

For [Apollo](https://www.apollographql.com/) you should create a new `ApolloLink`

```js
import { createTrackerLink } from '@openreplay/tracker-graphql'

const trackerLink = createTrackerLink(tracker);
const yourLink = new ApolloLink(trackerLink)
```

Alternatively you can use generic graphql handler:

```js
import { createGraphqlMiddleware } from '@openreplay/tracker-graphql'; // see above for recordGraphQL definition
import { ApolloLink } from 'apollo-link';

const handler = createGraphqlMiddleware(tracker)

const trackerApolloLink = new ApolloLink((operation, forward) => {
  return forward(operation).map(result =>
    handler(
      // op kind, name, variables, response, duration (default 0)
      operation.query.definitions[0].operation,
      operation.operationName,
      operation.variables,
      result,
    ),
  );
});

const link = ApolloLink.from([
  trackerApolloLink,
  // ...
]);
```

See [Apollo Link](https://www.apollographql.com/docs/link/) and
[Apollo Networking](https://www.apollographql.com/docs/react/networking/network-layer/)
for details.

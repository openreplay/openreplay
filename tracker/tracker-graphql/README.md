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
import { createGraphqlMiddleware } from '@openreplay/tracker-graphql';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

export const recordGraphQL = tracker.use(createGraphqlMiddleware());
```

### Relay

If you're using [Relay network tools](https://github.com/relay-tools/react-relay-network-modern),
you can simply [create a middleware](https://github.com/relay-tools/react-relay-network-modern/tree/master?tab=readme-ov-file#example-of-injecting-networklayer-with-middlewares-on-the-client-side) (async based); otherwise this will require wrapping fetch function with Observable.

```js
import { createRelayMiddleware } from '@openreplay/tracker-graphql';
import { Observable } from 'relay-runtime';

const withTracker = tracker.use(createRelayMiddleware())
function createFetchObservable(operation, variables) {
  return Observable.create(sink => {
    fetch(`YOUR URL`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: operation.text, variables }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then(data => {
        sink.next(data);
        sink.complete();
      })
      .catch(error => {
        sink.error(error);
      })
  });
}

const network = Network.create(withTracker(createFetchObservable));

const environment = new Environment({
  network,
  store: new Store(new RecordSource()),
});
```

```js
import { createRelayToolsMiddleware } from '@openreplay/tracker-graphql';

const trackerMiddleware = tracker.use(createRelayToolsMiddleware());

const network = new RelayNetworkLayer([
  trackerMiddleware,
]);
```

You can pass a Sanitizer function to `createRelayMiddleware` to sanitize the variables and data before sending them to OpenReplay.

```js
const trackerLink = tracker.use(
  createRelayMiddleware((variables) => {
    return {
      ...variables,
      password: '***',
    };
  }),
);
```

Or you can manually put `recordGraphQL` call
to the `NetworkLayer` implementation. If you are standard `Network.create` way to implement it,
then you should do something like below

```js
import { createGraphqlMiddleware } from '@openreplay/tracker-graphql'; // see above for recordGraphQL definition
import { Environment } from 'relay-runtime';

const handler = tracker.use(createGraphqlMiddleware());

function fetchQuery(operation, variables, cacheConfig, uploadables) {
  return fetch('www.myapi.com/resource', {
    // ...
  })
    .then((response) => response.json())
    .then((result) =>
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
import { createTrackerLink } from '@openreplay/tracker-graphql';

const trackerLink = tracker.use(createTrackerLink());
const yourLink = new ApolloLink(trackerLink);
```

You can pass a Sanitizer function to `createRelayMiddleware` to sanitize the variables and data before sending them to OpenReplay.

```js
const trackerLink = tracker.use(
  createTrackerLink((variables) => {
    return {
      ...variables,
      password: '***',
    };
  }),
);
```

Alternatively you can use generic graphql handler:

```js
import { createGraphqlMiddleware } from '@openreplay/tracker-graphql'; // see above for recordGraphQL definition
import { ApolloLink } from 'apollo-link';

const handler = tracker.use(createGraphqlMiddleware());

const trackerApolloLink = new ApolloLink((operation, forward) => {
  operation.setContext({ start: performance.now() });
  return forward(operation).map((result) => {
    const time = performance.now() - operation.getContext().start;
    return handler(
      // op kind, name, variables, response, duration (default 0)
      operation.query.definitions[0].operation,
      operation.operationName,
      operation.variables,
      result,
      time,
    );
  });
});

const link = ApolloLink.from([
  trackerApolloLink,
  // ...
]);
```

See [Apollo Link](https://www.apollographql.com/docs/link/) and
[Apollo Networking](https://www.apollographql.com/docs/react/networking/network-layer/)
for details.

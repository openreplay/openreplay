# OpenReplay Tracker GraphQL plugin

This plugin allows you to capture the GraphQL requests and then search by them.

## Installation

```bash
npm i @openreplay/tracker-graphql
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
The `plugin` call will return the function, which receives four variables
`operationKind`, `operationName`, `variables`, `result`
and returns `result` without changes.

```js
import Tracker from '@openreplay/tracker';
import trackerGraphQL from '@openreplay/tracker-graphql';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

export const recordGraphQL = tracker.plugin(trackerGraphQL());
```

### Relay

For [Relay](https://relay.dev/) you should manually put `recordGraphQL` call
to the `NetworkLayer` implementation. If you are standard `Network.create` way to implement it,
then you should do something like below

```js
import { recordGraphQL } from 'tracker'; // see above for recordGraphQL definition
import { Environment } from 'relay-runtime';

function fetchQuery(operation, variables, cacheConfig, uploadables) {
  return fetch('www.myapi.com/resource', {
    // ...
  })
    .then(response => response.json())
    .then(result =>
      recordGraphQL(operation.operationKind, operation.name, variables, result),
    );
}

const network = Network.create(fetchQuery);
```

See [Relay Network Layer](https://relay.dev/docs/en/network-layer) for details.

### Apollo

For [Apollo](https://www.apollographql.com/) you should create a new `ApolloLink` with
`recordGraphQL` call and put it to your chain like below

```js
import { recordGraphQL } from 'tracker'; // see above for recordGraphQL definition
import { ApolloLink } from 'apollo-link';

const trackerApolloLink = new ApolloLink((operation, forward) => {
  return forward(operation).map(result =>
    recordGraphQL(
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

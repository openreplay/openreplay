# OpenReplay Tracker Redux plugin

A Redux middleware for OpenReplay Tracker. This middleware allows you to see the application state during session replay.

## Installation

```bash
npm i @openreplay/tracker-redux
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then put the generated middleware into your Redux chain.

```js
import { applyMiddleware, createStore } from 'redux';
import Tracker from '@openreplay/tracker';
import trackerRedux from '@openreplay/tracker-redux';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

const openReplayMiddleware = tracker.use(trackerRedux());

const store = createStore(
  reducer,
  applyMiddleware(openReplayMiddleware),
);
```

You can customize the middleware behavior with options to sanitize your data.

```js
trackerRedux({
  actionFilter: action => action.type !== 'DRAW', // only actions which pass this test will be recorded
  actionTransformer: action => action.type === 'LOGIN' ? null : action,
  actionType: action => action.type // action type for search, that's the default one
  stateTransformer: state => {
    const { jwt, ..._state } = state;
    return _state;
  },
})
```

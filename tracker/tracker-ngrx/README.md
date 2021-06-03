# OpenReplay Tracker NgRx plugin

A NgRx meta-reducer for OpenReplay Tracker. This plugin allows you to see the application state during session replay.

## Installation

```bash
npm i @openreplay/tracker-ngrx
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then put the generated meta-reducer into your `imports`.
See [NgRx documentation](https://ngrx.io/guide/store/metareducers) for details.

```js
import { StoreModule } from '@ngrx/store';
import { reducers } from './reducers';
import Tracker from '@openreplay/tracker';
import trackerNgRx from '@openreplay/tracker-ngrx';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

const metaReducers = [tracker.plugin(trackerNgRx())];

@NgModule({
  imports: [StoreModule.forRoot(reducers, { metaReducers })],
})
export class AppModule {}
```

You can customize the middleware behavior with options to sanitize your data.

```js
trackerNgRx({
  actionFilter: action => action.type !== 'DRAW', // only actions which pass this test will be recorded
  actionTransformer: action => action.type === 'LOGIN' ? null : action,
  actionType: action => action.type // action type for search, that's the default one
  stateTransformer: state => {
    const { jwt, ..._state } = state;
    return _state;
  },
})
```

# OpenReplay Tracker MobX plugin
A MobX plugin for OpenReplay Tracker. This plugin allows you to see the MobX events during session replay.

## Installation
```bash
npm i @openreplay/tracker-mobx
```

## Usage
Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then put the generated middleware into your Redux chain.

```js
import Tracker from '@openreplay/tracker';
import trackerMobX from '@openreplay/tracker-mobx';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

tracker.plugin(trackerMobX());
```

This plugin is inspired by [mobx-logger](https://github.com/winterbe/mobx-logger), hence it has similar configurations.

The default configurations are following

```js
trackerMobX({
  predicate: () => true,
  action: true,
  reaction: true,
  transaction: true,
  compute: true
})
```

You can disable logging for actions and computed properties by providing a static `trackerMobXConfig`. This is useful to protect the private user data and keep your logs clean.

Here's an example of how to disable logging for all actions and computed properties for a given class:

```js
class MyModel {
  static trackerMobXConfig: {
    enabled: false
  };

  // ...
}
```

Alternatively you can disable logging for particular class methods:

```js
class MyStore {
  static trackerMobXConfig: {
    methods: {
      myAction: false
    }
  };

  @action myAction() {
    // calls to this method won't be logged
  }
}
```

You can combine the above examples to whitelist certain actions for being logged:

```js
class MyStore {
  static trackerMobXConfig: {
    enabled: false,
    methods: {
      myAction: true
    }
  };

  @action myAction() {
    // only calls to this method are being logged
  }

  // other methods won't be logged ...
}
```

> Please keep in mind that at this point `trackerMobXConfig` is only available for actions (`@action`) and computed properties (`@computed`).

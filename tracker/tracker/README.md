# OpenReplay Tracker

The main package of the [OpenReplay](https://openreplay.com/) tracker.

## Installation

```bash
npm i @openreplay/tracker 
```

## Usage

Initialize the package from your codebase entry point and start the tracker. You must set the `projectKey` option in the constructor. Its value can can be found in your OpenReplay dashboard under [Preferences -> Projects](https://app.openreplay.com/client/projects).

```js
import Tracker from '@openreplay/tracker';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});
tracker.start({
  userID: "Mr.Smith",
  metadata: {
    version: "3.5.0",
    balance: "10M",
    role: "admin",
  }
}).then(startedSession => {
  if (startedSession.success) {
    console.log(startedSession) 
  }
})
```

Then you can use OpenReplay JavaScript API anywhere in your code.

```js
tracker.setUserID('my_user_id');
tracker.setMetadata('env', 'prod');
```

Read [our docs](https://docs.openreplay.com/) for more information.

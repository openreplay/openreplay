# OpenReplay  Assist

OpenReplay Assist Plugin allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.

## Documentation

For launch options and available public methods, [refer to the documentation](https://docs.openreplay.com/plugins/assist)

## Installation

```bash
npm i @openreplay/tracker-assist
```
OR
```bash
yarn add @openreplay/tracker-assist
```

## Usage

### With NPM

Initialize the tracker then load the `@openreplay/tracker-assist` plugin.

#### If your website is a Single Page Application (SPA)

```js
import Tracker from '@openreplay/tracker';
import trackerAssist from '@openreplay/tracker-assist';

const tracker = new Tracker({
  projectKey: PROJECT_KEY,
});
tracker.use(trackerAssist(options)); // check the list of available options below

tracker.start();

```

#### If your web app is Server-Side-Rendered (SSR)

Follow the below example if your app is SSR. Ensure `tracker.start()` is called once the app is started (in `useEffect` or `componentDidMount`).

```js
import OpenReplay from '@openreplay/tracker/cjs';
import trackerFetch from '@openreplay/tracker-assist/cjs';

const tracker = new OpenReplay({
  projectKey: PROJECT_KEY
});
tracker.use(trackerAssist(options)); // check the list of available options below

//...
function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start();
  }, [])
//...
}
```

#### Options

```js
trackerAssist({
  callConfirm?: string|ConfirmOptions;
  controlConfirm?: string|ConfirmOptions;
  config?: object;
  onAgentConnect?: () => (()=>void | void);
  onCallStart?: () => (()=>void | void);
  onRemoteControlStart?: () => (()=>void | void);
})
```

```js
type ConfirmOptions = {
  text?:string,
  style?: StyleObject, // style object (i.e {color: 'red', borderRadius: '10px'})
  confirmBtn?: ButtonOptions,
  declineBtn?: ButtonOptions
}

type ButtonOptions = HTMLButtonElement | string | {
  innerHTML?: string, // to pass an svg string or text
  style?: StyleObject, // style object (i.e {color: 'red', borderRadius: '10px'})
}
```

- `callConfirm`: Customize the text and/or layout of the call request popup.
- `controlConfirm`: Customize the text and/or layout of the remote control request popup.
- `config`: Contains any custom ICE/TURN server configuration. Defaults to `{ 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }], 'sdpSemantics': 'unified-plan' }`.
- `onAgentConnect: () => (()=>void | void)`: This callback function is fired when someone from OpenReplay UI connects to the current live session. It can return another function. In this case, returned callback will be called when the same agent connection gets closed.

```js
onAgentConnect = () => {
  console.log("Live session started")
  const onAgentDisconnect =  () => console.log("Live session stopped")
  return onAgentDisconnect
}
```

- `onCallStart: () => (()=>void | void)`: This callback function is fired as soon as a call (webRTC) starts. It can also return `onCallEnd` which will be called when the call ends. In case of an unstable connection, this may be called several times. Below is an example:

```js
onCallStart: () => {
  console.log("Call started")
  const onCallEnd = () => console.log("Call ended")
  return onCallEnd
}
```

- `onRemoteControlStart: () => (()=>void | void)`: This callback function is fired as soon as a remote control session starts. It can also return `onRemoteControlEnd` which will be called when the remote control permissions are revoked. Below is an example:

```js
onCallStart: () => {
  console.log("Remote control started")
  const onCallEnd = () => console.log("Remote control ended")
  return onCallEnd
}
```

## Troubleshooting

### Critical dependency: the request of a dependency is an expression

Please apply this [workaround](https://github.com/peers/peerjs/issues/630#issuecomment-910028230) if you face the below error when compiling:

```log
Failed to compile.

./node_modules/peerjs/dist/peerjs.min.js
Critical dependency: the request of a dependency is an expression
```

If you encounter any other issue, please connect to our [Slack](https://slack.openreplay.com) and get help from our community.

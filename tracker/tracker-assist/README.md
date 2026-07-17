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

// .start() returns a promise
tracker.start().then(sessionData => ... ).catch(e => ... )

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
    // .start() returns a promise
    tracker.start().then(sessionData => ... ).catch(e => ... )
  }, [])
//...
}
```

#### Options

```ts
trackerAssist({
  onAgentConnect: StartEndCallback;
  onCallStart: StartEndCallback;
  onRemoteControlStart: StartEndCallback;
  onRecordingRequest?: (agentInfo: Record<string, any>) => any;
  onCallDeny?: () => any;
  onRemoteControlDeny?: (agentInfo: Record<string, any>) => any;
  onRecordingDeny?: (agentInfo: Record<string, any>) => any;
  onSessionConfirmApprove?: (agentInfo: Record<string, any>) => any;
  onSessionConfirmDeny?: (agentInfo: Record<string, any>) => any;
  session_calling_peer_key: string;
  session_control_peer_key: string;
  callConfirm: ConfirmOptions;
  controlConfirm: ConfirmOptions;
  recordingConfirm: ConfirmOptions;
  sessionConfirm: ConfirmOptions;
  socketHost?: string;
  config: RTCConfiguration;
  serverURL: string
  callUITemplate?: string;
  agentShortNames?: boolean;
  ignoreAnonymous?: boolean;
  autostart?: Autostart; // 'disabled' | 'continuation' | 'auto'
  requestConfirm?: boolean;
})
```

- `agentShortNames`: When `true`, only the first part of an agent's name is shown in the call popup (e.g. `"John Doe"` → `"John"`). Defaults to `false`.
- `ignoreAnonymous`: When `true`, assist postpones connecting until a `userID` is set on the session (via `tracker.setUserID(...)`). Anonymous sessions won't appear as live until identified. Defaults to `false`.
- `autostart`: Controls when assist connects. Import the `Autostart` enum from the package. Defaults to `Autostart.Auto`.
  - `Autostart.Auto`: always connect on `tracker.start()` (legacy behavior).
  - `Autostart.Disabled`: never connect automatically; call `assist.start()` yourself.
  - `Autostart.Continuation`: connect only after `assist.start()` is called, but remember that choice in `sessionStorage` so assist auto-continues across page reloads until `assist.stop()` is called.
- `requestConfirm`: When `true`, assist connects as usual but sends nothing to the agents until the user approves a confirmation popup, shown as soon as the first agent connects to the session. On approval, tracking restarts so agents receive a full snapshot; the approval is remembered per-tab (`sessionStorage`) until `assist.stop()` is called. On denial, the session stays connected but silent, and the popup is shown again on the next agent connection. Use `sessionConfirm` to customize the popup and `onSessionConfirmApprove`/`onSessionConfirmDeny` for callbacks. Defaults to `false`.

#### Public methods

`tracker.use(trackerAssist(options))` returns the assist instance (or `undefined` when assist can't load — e.g. inside an iframe, unsupported browser, or tracker version mismatch), which exposes:

- `start()`: connect assist. In `Autostart.Continuation` mode this also persists the flag used to auto-continue after reloads. No-op until the tracker itself is active.
- `stop()`: disconnect assist and tear down all live connections. It won't reconnect automatically until `start()` is called again; in `Autostart.Continuation` mode it clears the persisted flag.

```js
import Tracker from '@openreplay/tracker';
import trackerAssist, { Autostart } from '@openreplay/tracker-assist';

const tracker = new Tracker({ projectKey: PROJECT_KEY });
const assist = tracker.use(trackerAssist({ autostart: Autostart.Continuation }));

tracker.start().then(() => {
  // enable assist on demand; it will resume automatically on reload
  assist?.start();
});

// later, to fully turn it off:
assist?.stop();
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
- `sessionConfirm`: Customize the text and/or layout of the session view confirmation popup (`requestConfirm` mode).
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

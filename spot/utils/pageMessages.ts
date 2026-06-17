/**
 * Page-world message types sent over window.postMessage, grouped by the peer
 * the content script talks to. The string values are the wire contract shared
 * with each peer, so they must not change without updating the other side.
 */
export const pageMessages = {
  // content script <-> OpenReplay web app
  webapp: {
    ping: "orspot:ping",
    pong: "orspot:pong",
    token: "orspot:token",
    logged: "orspot:logged",
    invalidate: "orspot:invalidate",
  },
  // content script <-> injected page script (console + network capture)
  injected: {
    consoleStart: "injected:c-start",
    consoleStop: "injected:c-stop",
    networkStart: "injected:n-start",
    networkStop: "injected:n-stop",
    bumpLogs: "ort:bump-logs",
    bumpNetwork: "ort:bump-network",
  },
  // content script -> notifications overlay
  notifications: {
    display: "ornotif:display",
    copy: "ornotif:copy",
    stop: "ornotif:stop",
  },
  // content script -> in-page recording controls
  controls: {
    triggerStop: "content:trigger-stop",
  },
} as const;

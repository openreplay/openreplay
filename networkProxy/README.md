this tiny library helps us (OpenReplay folks) to create proxy objects for fetch,
XHR and beacons for proper request tracking in @openreplay/tracker and Spot extension.

example usage:
```
import createNetworkProxy from '@openreplay/network-proxy';

const context = this;
const ignoreHeaders = ['Authorization'];
const tokenUrlMatcher = /\/auth\/token/;
function setSessionTokenHeader(setRequestHeader: (name: string, value: string) => void) {
  const header = 'X-Session-Token
  const sessionToken = getToken() // for exmaple, => `session #123123`;
  if (sessionToken) {
    setRequestHeader(header, sessionToken)
  }
}
function sanitize(reqResInfo) {
  if (reqResInfo.request) {
    delete reqResInfo.request.body
  }
  return reqResInfo
}

const onMsg = (networkReq) => console.log(networkReq)
const isIgnoredUrl = (url) => url.includes('google.com')

// Gets current tracker request’s url and returns boolean. If present,
// sessionTokenHeader will only be applied when this function returns true.
// Default: undefined
const tokenUrlMatcher = (url) => url.includes('google.com');

// this will observe global network requests
createNetworkProxy(
  context,
  options.ignoreHeaders,
  setSessionTokenHeader,
  sanitize,
  (message) => app.send(message),
  (url) => app.isServiceURL(url),
  options.tokenUrlMatcher,
)

// to stop it, you can save this.fetch/other apis before appliying the proxy
// and then restore them
```

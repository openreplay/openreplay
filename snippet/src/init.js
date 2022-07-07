import Tracker from '@openreplay/tracker';


export default function initTracker(argOptions = {}) {
  const stack = (window.OpenReplay || window.asayer);
  const projectKey = stack.shift();
  const sessionToken = stack.shift();
  let stackOpts = stack.shift();
  if (typeof stackOpts === "number") {
    stackOpts = {
      obscureTextEmails: !!(stackOpts & 1),
      obscureTextNumbers: !!((stackOpts >> 1) & 1),
      obscureInputNumbers: !!((stackOpts >> 3) & 1),
      obscureInputEmails: !!((stackOpts >> 4) & 1),
      defaultInputMode: stackOpts >> 5,
    }
  }
  if (typeof stackOpts !== "object" || stackOpts === null) {
    stackOpts = {}
  }


  const options = Object.assign({
    projectKey,
    sessionToken,
  }, stackOpts, argOptions, {
    __is_snippet: true, // internal
  });
  if (stack.i) {
    options.ingestPoint = stack.i;
  }

  const openReplay = window.OpenReplay = window.asayer = new Tracker(options);


  const setUserID = openReplay.setUserID.bind(openReplay);
  openReplay.setUserID = openReplay.userID = id => {
    if (typeof id !== undefined && id !== null) {
      setUserID(id.toString());
    }
  };
  const setUserAnonymousID = openReplay.setUserAnonymousID.bind(openReplay);
  openReplay.setUserAnonymousID = openReplay.userAnonymousID = id => {
    if (typeof id !== undefined && id !== null) {
      setUserAnonymousID(id.toString());
    }
  };
  const setMetadata = openReplay.setMetadata.bind(openReplay);
  openReplay.setMetadata = openReplay.metadata = (key, value) => {
    if (typeof value === 'number' && value !== NaN) {
      value = value.toString();
    }
    if (typeof key === 'string' && typeof value === 'string') {
      setMetadata(key, value);
    }
  };
  const event = openReplay.event.bind(openReplay);
  openReplay.event = (key, payload) => {
    if (typeof key === 'string') {
      event(key, payload);
    }
  };
  while (stack.length) {
    const s = stack.shift();
    switch (s[0]) {
      case 0:
        openReplay.start(s[1]);
        break;
      case 1:
        openReplay.stop();
        break;
      case 2:
        openReplay.setUserID(s[1]);
        break;
      case 3:
        openReplay.setUserAnonymousID(s[1]);
        break;
      case 4:
        openReplay.setMetadata(s[1], s[2]);
        break;
      case 5:
        openReplay.event(s[1], s[2], s[3]);
        break;
      case 6:
        openReplay.issue(s[1], s[2])
        break;
    }
  }

  return openReplay;
}

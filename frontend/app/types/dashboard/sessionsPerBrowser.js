import { Record } from 'immutable';

const SessionsPerBrowser = Record({
  count: undefined,
  chart: [],
});

function fromJS(sessionsPerBrowser = {}) {
  if (sessionsPerBrowser instanceof SessionsPerBrowser) return sessionsPerBrowser;
  return new SessionsPerBrowser({...sessionsPerBrowser, avg: Math.round(sessionsPerBrowser.avg)});
}

export default fromJS;

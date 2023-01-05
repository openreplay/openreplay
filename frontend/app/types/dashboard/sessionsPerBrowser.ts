interface ISessionsPerBrowser {
  count?: number,
  chart?: any[],
  avg: number,
}

class SessionsPerBrowser {
  count: ISessionsPerBrowser["count"]
  chart: ISessionsPerBrowser["chart"] = []
  avg: ISessionsPerBrowser["avg"]

  constructor(data: ISessionsPerBrowser) {
    Object.assign(this, data)
  }
}

function fromJS(sessionsPerBrowser = {}) {
  if (sessionsPerBrowser instanceof SessionsPerBrowser) return sessionsPerBrowser;
  return new SessionsPerBrowser({...sessionsPerBrowser, avg: Math.round(sessionsPerBrowser.avg)});
}

export default fromJS;

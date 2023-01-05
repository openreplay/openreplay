interface ISessionsSlowRequests {
  avg: number;
  chart: any[];
}

class SessionsImpactedBySlowRequests {
  avg: ISessionsSlowRequests["avg"];
  chart: ISessionsSlowRequests["chart"] = [];

  constructor(data: ISessionsSlowRequests) {
    Object.assign(this, data)
  }
}

function fromJS(data = {}) {
  if (data instanceof SessionsImpactedBySlowRequests) return data;
  return new SessionsImpactedBySlowRequests(data);
}

export default fromJS;
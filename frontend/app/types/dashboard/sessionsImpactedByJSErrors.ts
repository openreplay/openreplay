interface ISessionsImpactedByJSErrors {
  errorsCount: number;
  chart: any[];
}

class SessionsImpactedByJSErrors {
  errorsCount: ISessionsImpactedByJSErrors["errorsCount"];
  chart: ISessionsImpactedByJSErrors["chart"];

  constructor(data: ISessionsImpactedByJSErrors) {
    Object.assign(this, data)
  }
}

function fromJS(data = {}) {
  if (data instanceof SessionsImpactedByJSErrors) return data;
  return new SessionsImpactedByJSErrors(data);
}

export default fromJS;
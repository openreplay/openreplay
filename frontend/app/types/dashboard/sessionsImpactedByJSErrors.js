import { Record } from 'immutable';

const SessionsImpactedByJSErrors = Record({
  errorsCount: undefined,
  chart: []
});


function fromJS(data = {}) {
  if (data instanceof SessionsImpactedByJSErrors) return data;
  return new SessionsImpactedByJSErrors(data);
}

export default fromJS;
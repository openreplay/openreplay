import { Record } from 'immutable';

const SessionsImpactedBySlowRequests = Record({
  avg: undefined,
  chart: [],
});


function fromJS(data = {}) {
  if (data instanceof SessionsImpactedBySlowRequests) return data;
  return new SessionsImpactedBySlowRequests(data);
}

export default fromJS;
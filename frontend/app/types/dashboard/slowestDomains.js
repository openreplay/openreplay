import { Record } from 'immutable';

const SlowestDomains = Record({
  partition: [],
  avg: undefined,
});

function fromJS(slowestDomains = {}) {
  if (slowestDomains instanceof SlowestDomains) return slowestDomains;
  return new SlowestDomains({...slowestDomains, avg: Math.round(slowestDomains.avg)});
}

export default fromJS;

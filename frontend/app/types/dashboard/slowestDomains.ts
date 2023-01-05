import { Record } from 'immutable';

interface ISlowestDomains {
  partition?: string[];
  avg: number;
}

class SlowestDomains {
  partition: ISlowestDomains["partition"] = [];
  avg: ISlowestDomains["avg"];

  constructor(data: ISlowestDomains) {
    Object.assign(this, data)
  }
}

function fromJS(slowestDomains = {}) {
  if (slowestDomains instanceof SlowestDomains) return slowestDomains;
  return new SlowestDomains({...slowestDomains, avg: Math.round(slowestDomains.avg)});
}

export default fromJS;

import { Record } from 'immutable';

const TopDomains = Record({
  chart: []
});

function fromJS(data = {}) {
  if (data instanceof TopDomains) return data;
  return new TopDomains(data);
}

export default fromJS;
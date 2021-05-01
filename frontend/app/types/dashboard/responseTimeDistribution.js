import { Record } from 'immutable';

const ResponseTimeDistribution = Record({
  chart: [],
  avg: undefined,
  percentiles: [],
  extremeValues: [],
  total: undefined
});


function fromJS(data = {}) {
  if (data instanceof ResponseTimeDistribution) return data;
  return new ResponseTimeDistribution(data);
}

export default fromJS;
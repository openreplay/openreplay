import { Record } from 'immutable';

const CustomMetric = Record({
  avg: undefined,
  chart: [],
});


function fromJS(data = {}) {
  if (data instanceof CustomMetric) return data;
  return new CustomMetric(data);
}

export default fromJS;
import { Record } from 'immutable';

const TimeToRender = Record({
  avg: undefined,
  chart: [],
});

function fromJS(data = {}) {
  if (data instanceof TimeToRender) return data;
  return new TimeToRender(data);
}

export default fromJS;
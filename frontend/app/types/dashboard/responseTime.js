import { Record } from 'immutable';

const ResponseTime = Record({
  avg: undefined,
  chart: [],
});


function fromJS(data = {}) {
  if (data instanceof ResponseTime) return data;
  return new ResponseTime(data);
}

export default fromJS;
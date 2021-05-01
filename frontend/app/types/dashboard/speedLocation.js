import { Record } from 'immutable';

const SpeedLocation = Record({
  avg: undefined,
  chart: [],
});


function fromJS(data = {}) {
  if (data instanceof SpeedLocation) return data;
  return new SpeedLocation(data);
}

export default fromJS;
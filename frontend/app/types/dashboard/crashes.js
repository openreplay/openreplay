import { Record } from 'immutable';

const Crashes = Record({
  chart: [],
  browsers: []
});


function fromJS(data = {}) {
  if (data instanceof Crashes) return data;
  return new Crashes(data);
}

export default fromJS;
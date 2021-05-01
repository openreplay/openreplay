import { Record } from 'immutable';

const Performance = Record({
  chart: [],
});


function fromJS(performance = {}) {
  if (performance instanceof Performance) return performance;
  return new Performance(performance);
}

export default fromJS;
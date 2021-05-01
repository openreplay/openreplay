import { Record } from 'immutable';

const ErrorsByType = Record({
  chart: [],
});


function fromJS(data = {}) {
  if (data instanceof ErrorsByType) return data;
  return new ErrorsByType(data);
}

export default fromJS;
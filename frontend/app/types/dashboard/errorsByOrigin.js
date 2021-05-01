import { Record } from 'immutable';

const ErrorsByOrigin = Record({
  chart: []
});


function fromJS(data = {}) {
  if (data instanceof ErrorsByOrigin) return data;
  return new ErrorsByOrigin(data);
}

export default fromJS;
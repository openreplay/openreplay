import { Record } from 'immutable';

const DomBuildingTime = Record({
  avg: undefined,
  chart: [],
});


function fromJS(data = {}) {
  if (data instanceof DomBuildingTime) return data;
  return new DomBuildingTime(data);
}

export default fromJS;
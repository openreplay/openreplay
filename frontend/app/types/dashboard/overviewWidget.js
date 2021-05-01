import { Record } from 'immutable';

const OverviewWidget = Record({
  key: undefined,
  value: undefined,
  progress: undefined,
  chart: [],
});


function fromJS(data = {}) {
  if (data instanceof OverviewWidget) return data;
  
  if (data.key === "avgSessionDuration") {
    data.value = data.value / 100000
  }
  return new OverviewWidget(data);
}

export default fromJS;
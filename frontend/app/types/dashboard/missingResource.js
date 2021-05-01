import Record from 'Types/Record';
import { convertNumberRange, getResourceName } from 'App/utils';


export default Record({
  url: '',
  name: '',
  count: undefined,
  sessions: undefined,
  startedAt: undefined,
  endedAt: undefined,
  startTimestamp: undefined,
  endTimestamp: undefined,
  chart: [],
}, {
  fromJS: ({ chart = [], ...missingResource }) => {
    const oldMax = [ ...chart ].sort((a, b) => b.count - a.count)[ 0 ].count;
    const formattedChart = chart.map(({ count, ...rest }) =>
      ({ count: convertNumberRange(oldMax, 0, 2, 20, count), ...rest }));
    return {
      ...missingResource,
      chart: formattedChart,
      name: getResourceName(missingResource.url),
    }
  }
});
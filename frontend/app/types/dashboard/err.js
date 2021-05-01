import Record from 'Types/Record';
import { convertNumberRange } from 'App/utils';

export default Record({
  error: '',
  count: undefined,
  sessions: undefined,
  firstOccurrenceAt: undefined,
  lastOccurrenceAt: undefined,
  startTimestamp: undefined,
  endTimestamp: undefined,
  chart: [],
}, {
  fromJS: ({ chart = [], ...err }) => {
    const oldMax = [ ...chart ].sort((a, b) => b.count - a.count)[ 0 ].count;
    const formattedChart = chart.map(({ count, ...rest }) =>
      ({ count: convertNumberRange(oldMax, 0, 2, 20, count), ...rest }));
    return {
      ...err,
      chart: formattedChart,
    }
  }
});
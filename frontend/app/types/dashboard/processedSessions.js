import { Record } from 'immutable';

const ProcessedSessions = Record({
  count: undefined,
  progress: undefined,
  chart: [],
});

function fromJS(processedSessions = {}) {
  if (processedSessions instanceof ProcessedSessions) return processedSessions;
  return new ProcessedSessions(processedSessions);
}

export default fromJS;

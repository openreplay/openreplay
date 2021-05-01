import { Record } from 'immutable';

const Errors = Record({
  count: undefined,
  progress: undefined,
  impactedSessions: undefined,
  impactedSessionsProgress: undefined,
  chart: [],
});

function fromJS(errors = {}) {
  if (errors instanceof Errors) return errors;
  return new Errors(errors);
}

export default fromJS;

import { Record, List } from 'immutable';
import { DateTime, Duration } from 'luxon';

const Step = Record({
  duration: undefined,
  startedAt: undefined,
  label: undefined,
  input: undefined,
  info: undefined,
  order: undefined,
  screenshotUrl: undefined,
  steps: List(),
});

function fromJS(step = {}) {
  const startedAt = step.startedAt && DateTime.fromMillis(step.startedAt * 1000);
  const duration = step.executionTime && Duration.fromMillis(step.executionTime);
  const steps = List(step.steps).map(Step);
  const screenshotUrl = step.screenshot_url;
  return new Step({
    ...step,
    steps,
    startedAt,
    duration,
    screenshotUrl,
  });
};

export default fromJS;
import { Record, List, Set } from 'immutable';
import { validateName } from 'App/validate';
import { DateTime } from 'luxon';
import Run from './run';
import Step from './step';

class Test extends Record({
  testId: undefined,
  name: 'Unnamed Test',
  steps: List(),
  stepsCount: undefined,
  framework: 'selenium',
  sessionId: undefined,
  generated: false,
  tags: Set(),
  runHistory: List(),
  editedAt: undefined,
  seqId: undefined,
  seqChange: false,
  uptime: 0,
}) {
  // ???TODO
  // idKey = "testId"

  exists() {
    return this.testId !== undefined;
  }

  validate() {
    if (this.steps.size === 0) return false;

    return validateName(this.name, {
      empty: false,
      admissibleChars: ':-',
    });
  }

  isComplete() {
    return this.stepsCount === this.steps.size;
  }

  // not the best code
  toData() {
    const js = this
      .update('steps', steps => steps.map(step => step.toData()))
      .toJS();

    if (js.seqChange) {
      const { testId, seqId } = js;
      return { testId, seqId };
    }

    delete js.stepsCount;
    delete js.seqChange;

    return js;
  }
  // not the best code
}

const fromJS = (test = {}) => {
  if (test instanceof Test) return test;

  const stepsLength = test.steps && test.steps.length; //
  const editedAt = test.editedAt ? DateTime.fromMillis(test.editedAt) : undefined;

  const lastRun = Run(test.lastRun);
  const runHistory = List(test.runHistory) // TODO: GOOD ENDPOINTS
    .map(run => {
      if (typeof run === 'string') {
        return run === lastRun.runId 
          ? lastRun 
          : Run({ runId: run })
      }
      return Run(run);
    });

  return new Test({ ...test, editedAt, uptime: parseInt(test.passed / test.count  * 100) || 0  })
    .set('stepsCount', typeof test.stepsCount === 'number'
      ? test.stepsCount
      : stepsLength) //
    .set('runHistory', runHistory) 
    .set('steps', List(test.steps).map(Step))
    .set('tags', test.tags && Set(test.tags.map(t => t.toLowerCase())));
};

export default fromJS;

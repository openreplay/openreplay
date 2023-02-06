import { Map } from 'immutable';
import Test from 'Types/appTest';
import Run, { RUNNING, STOPPED } from 'Types/run';
import requestDuckGenerator, { RequestTypes } from 'Duck/tools/requestDuck';
import { reduceDucks } from 'Duck/tools';

const GEN_TEST = new RequestTypes('tests/GEN_TEST');
const RUN_TEST = new RequestTypes('tests/RUN_TEST');
const STOP_RUN = new RequestTypes('tests/STOP_RUN');
const STOP_ALL_RUNS = new RequestTypes('tests/STOP_ALL_RUNS');
const CHECK_RUN = new RequestTypes('tests/CHECK_RUN');
const RESET_ERRORS = 'tests/RESET_ERRORS';

const updateRunInTest = run => (test) => {
  const runIndex = test.runHistory
    .findLastIndex(({ runId }) => run.runId === runId);
  return runIndex === -1
    ? test.update('runHistory', list => list.push(run))
    : test.mergeIn([ 'runHistory', runIndex ], run);
};

const updateRun = (state, testId, run) => {
  const testIndex = state.get('list').findIndex(test => test.testId === testId);
  if (testIndex === -1) return state;
  const updater = updateRunInTest(run);
  return state
    .updateIn([ 'list', testIndex ], updater)
    .updateIn([ 'instance' ], test => (test.testId === testId
      ? updater(test)
      : test));
};

const initialState = Map({});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case GEN_TEST.SUCCESS:
      return state.set('instance', Test(action.data).set('generated', true));
    case RUN_TEST.SUCCESS: {
      const test = state.get('list').find(({ testId }) => testId === action.testId);
      const run = Run({
        runId: action.data.id, state: RUNNING, testId: action.testId, name: test.name
      });
      return updateRun(state, action.testId, run);
    }
    case STOP_RUN.SUCCESS: {
      const { testId, runId } = action;
      return updateRun(state, testId, { runId, state: STOPPED });
    }
    case STOP_ALL_RUNS.SUCCESS:
      return state.update('list', list => list.map(test => {
        test.runHistory.map(run => run.state === RUNNING ? run.set('state', STOPPED) : run.state);
        return test;
      })).setIn(['runRequest', 'errors'], null);
    case CHECK_RUN.SUCCESS:
      return updateRun(state, action.testId, Run(action.data));
    case RESET_ERRORS:
      return state.setIn(['runRequest', 'errors'], null);
  }
  return state;
};

const requestDuck = requestDuckGenerator({
  runRequest: RUN_TEST,
  stopRunRequest: STOP_RUN,
  stopAllRunsRequest: STOP_ALL_RUNS,
  genTestRequest: GEN_TEST,
});

export default reduceDucks({ reducer, initialState }, requestDuck);


export function generateTest(sessionId, params) {
  return {
    types: GEN_TEST.toArray(),
    call: client => client.post(`/sessions/${ sessionId }/gentest`, params),
  };
}


export function runTest(testId, params) {
  return {
    testId,
    types: RUN_TEST.toArray(),
    call: client => client.post(`/tests/${ testId }/execute`, params),
  };
}

export function stopRun(testId, runId) {
  return {
    runId,
    testId,
    types: STOP_RUN.toArray(),
    call: client => client.get(`/runs/${ runId }/stop`),
  };
}

export function stopAllRuns() {
  return {
    types: STOP_ALL_RUNS.toArray(),
    call: client => client.get(`/runs/all/stop`),
  };
}

export function resetErrors() {
  return {
    type: RESET_ERRORS,
  }
}

export function checkRun(testId, runId) {
  return {
    runId,
    testId,
    types: CHECK_RUN.toArray(),
    call: client => client.get(`/runs/${ runId }`),
  };
}

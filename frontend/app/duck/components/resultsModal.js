import { List, Map } from 'immutable';
import Run from 'Types/run';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';

const OPEN = 'resultsModal/OPEN';
const CLOSE = 'resultsModal/CLOSE';
const FETCH = new RequestTypes('resultsModal/FETCH');

const initialState = Map({
  results: Run(),
  open: false,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case OPEN:
      return state.set('open', true).set('results', action.results);
    case CLOSE:
      return state.set('open', false);
    case FETCH.REQUEST:
      return state.set(
        'results',
        Run(),
      ).set('open', true);
    case FETCH.SUCCESS:      
      return state.set(
        'results',
        Run(action.data),
      ).set('open', true);
  }
  return state;
};

export default withRequestState(FETCH, reducer);

export function open(results) {
  return {
    type: OPEN,
    results,
  };
}

export function close() {
  return {
    type: CLOSE,
  };
}

export function fetchResults(runId) {
  return {
    types: FETCH.toArray(),
    call: client => client.get(`/runs/${ runId }`),
  };
}

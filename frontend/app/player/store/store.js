import { createStore } from 'redux';
import reducer, {
	update as updateAction,
	clean as cleanAction,
} from './duck';

const store = createStore(reducer);

export const getState = store.getState.bind(store);

export function update(...args) {
	return store.dispatch(updateAction(...args));
}

export function clean() {
	return store.dispatch(cleanAction());
}

export default store;

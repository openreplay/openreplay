import { createStore } from 'redux';
import reducer, {
	update as updateAction,
	clean as cleanAction,
} from './duck';

const store = createStore(reducer);

export const getState = store.getState.bind(store);

export function update(...args) {
	const action = updateAction(...args)
	return store.dispatch(action);
}

export function cleanStore() {
	return store.dispatch(cleanAction());
}

export default store;

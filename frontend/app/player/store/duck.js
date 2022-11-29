import { applyChange, revertChange } from 'deep-diff';
import { INITIAL_STATE as playerInitialState, INITIAL_NON_RESETABLE_STATE as playerInitialNonResetableState } from '../Player';

const UPDATE = 'player/UPDATE';
const CLEAN = 'player/CLEAN';
const REDUX = 'player/REDUX';

const resetState = {
	...playerInitialState,
	initialized: false,
};

const initialState = {
	...resetState,
	...playerInitialNonResetableState,
}

export default (state = initialState, action = {}) => {
	switch (action.type) {
		case UPDATE:
			return { ...state, ...action.state };
		case CLEAN:
			return { ...state, ...resetState };
		default:
			return state;
	}
}

export function update(state = {}) {
	return {
		type: UPDATE,
		state,
	};
}

export function clean() {
	return {
		type: CLEAN
	};
}

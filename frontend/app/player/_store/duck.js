import { applyChange, revertChange } from 'deep-diff';

import { INITIAL_STATE as MM_INITIAL_STATE } from '../_web/MessageManager'
import Player from '../player/Player'

const UPDATE = 'player/UPDATE';
const CLEAN = 'player/CLEAN';
const REDUX = 'player/REDUX';

const resetState = {
	...MM_INITIAL_STATE,
	...Player.INITIAL_STATE,
	initialized: false,
};

const initialState = {
	...resetState,
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

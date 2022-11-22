import WebPlayer from '../web/WebPlayer'

const UPDATE = 'player/UPDATE';
const CLEAN = 'player/CLEAN';
const REDUX = 'player/REDUX';

const resetState = {
	...WebPlayer.INITIAL_STATE,
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

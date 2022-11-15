const REDUX = "redux";
const MOBX = "mobx";
const VUEX = "vuex";
const NGRX = "ngrx";
const ZUSTAND = 'zustand';
const NONE = 0;


export const STORAGE_TYPES = {
	REDUX,
	MOBX,
	VUEX,
	NGRX,
	ZUSTAND,
	NONE,
};


export function selectStorageType(state) {
	if (!state.reduxList) return NONE;
	if (state.reduxList.length > 0) {
		return REDUX;
	} else if (state.vuexList.length > 0) {
		return VUEX;
	} else if (state.mobxList.length > 0) {
		return MOBX;
	} else if (state.ngrxList.length > 0) {
		return NGRX;
	} else if (state.zustandList.length > 0) {
		return ZUSTAND;
	}
	return NONE;
}

export function selectStorageList(state) {
	const key = selectStorageType(state);
	if (key !== NONE) {
		return state[`${key}List`] || [];
	}
	return [];
}
export function selectStorageListNow(state) {
	const key = selectStorageType(state);
	if (key !== NONE) {
		return state[`${key}ListNow`] || [];
	}
	return [];
}

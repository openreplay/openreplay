import { State } from './Lists'

enum StorageType {
 REDUX = "redux",
 MOBX = "mobx",
 VUEX = "vuex",
 NGRX = "ngrx",
 ZUSTAND = "zustand",
 NONE = 0,
}

export const STORAGE_TYPES = StorageType

export function selectStorageType(state: State): StorageType {
	if (!state.reduxList) return STORAGE_TYPES.NONE
	if (state.reduxList.length > 0) {
		return STORAGE_TYPES.REDUX
	} else if (state.vuexList.length > 0) {
		return STORAGE_TYPES.VUEX
	} else if (state.mobxList.length > 0) {
		return STORAGE_TYPES.MOBX
	} else if (state.ngrxList.length > 0) {
		return STORAGE_TYPES.NGRX
	} else if (state.zustandList.length > 0) {
		return STORAGE_TYPES.ZUSTAND
	}
	return STORAGE_TYPES.NONE
}

export function selectStorageList(state: State) {
	const key = selectStorageType(state)
	if (key !== StorageType.NONE) {
		return state[`${key}List`]
	}
	return []
}
export function selectStorageListNow(state: State) {
	const key = selectStorageType(state)
	if (key !== StorageType.NONE) {
		return state[`${key}ListNow`]
	}
	return []
}

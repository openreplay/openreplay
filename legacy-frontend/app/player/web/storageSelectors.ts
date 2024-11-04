import { State } from './Lists'

export enum StorageType {
 REDUX = "redux",
 MOBX = "mobx",
 VUEX = "vuex",
 NGRX = "ngrx",
 ZUSTAND = "zustand",
 NONE = 0,
}

export const STORAGE_TYPES = StorageType // TODO: update name everywhere

export function selectStorageType(state: State): StorageType {
	if (state.reduxList?.length > 0) {
		return StorageType.REDUX
	} else if (state.vuexList?.length > 0) {
		return StorageType.VUEX
	} else if (state.mobxList?.length > 0) {
		return StorageType.MOBX
	} else if (state.ngrxList?.length > 0) {
		return StorageType.NGRX
	} else if (state.zustandList?.length > 0) {
		return StorageType.ZUSTAND
	}
	return StorageType.NONE
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

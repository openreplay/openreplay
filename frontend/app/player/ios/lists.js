import { makeAutoObservable } from "mobx"
import ListWalker from '../MessageDistributor/managers/ListWalker';

import ScreenList from './ScreenList';

export function createListState(list) {
	return makeAutoObservable(new ListWalker(list));
}

export function createScreenListState() {
	return makeAutoObservable(new ScreenList());
}
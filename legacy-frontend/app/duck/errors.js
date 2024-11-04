import { List, Map } from 'immutable'; 
import { clean as cleanParams } from 'App/api_client';
import ErrorInfo, { RESOLVED, UNRESOLVED, IGNORED, BOOKMARK } from 'Types/errorInfo';
import { fetchListType, fetchType } from './funcTools/crud';
import { createRequestReducer, ROOT_KEY } from './funcTools/request';
import { array, success, failure, createListUpdater, mergeReducers } from './funcTools/tools';
import { reduceThenFetchResource } from './search'

const name = "error";
const idKey = "errorId";
const PER_PAGE = 10;
const DEFAULT_SORT = 'occurrence';
const DEFAULT_ORDER = 'desc';

const EDIT_OPTIONS = `${name}/EDIT_OPTIONS`;
const FETCH_LIST = fetchListType(name);
const FETCH = fetchType(name);
const FETCH_NEW_ERRORS_COUNT = fetchType('errors/FETCH_NEW_ERRORS_COUNT');
const RESOLVE = "errors/RESOLVE";
const UNRESOLVE = "errors/UNRESOLVE";
const IGNORE = "errors/IGNORE";
const MERGE = "errors/MERGE";
const TOGGLE_FAVORITE = "errors/TOGGLE_FAVORITE";
const FETCH_TRACE = "errors/FETCH_TRACE";
const UPDATE_CURRENT_PAGE = "errors/UPDATE_CURRENT_PAGE";
const UPDATE_KEY = `${name}/UPDATE_KEY`;

function chartWrapper(chart = []) {
  return chart.map(point => ({ ...point, count: Math.max(point.count, 0) }));
}

const updateItemInList = createListUpdater(idKey);
const updateInstance = (state, instance) => state.getIn([ "instance", idKey ]) === instance[ idKey ]
	? state.mergeIn([ "instance" ], instance)
	: state;

const initialState = Map({
	totalCount: 0,
	list: List(),
	instance: ErrorInfo(),
	instanceTrace: List(),
	stats: Map(),
	sourcemapUploaded: true,
  	currentPage: 1,
	limit: PER_PAGE,
	options: Map({
		sort: DEFAULT_SORT,
		order: DEFAULT_ORDER,
		status: UNRESOLVED,
		query: '',
	}),
	// sort: DEFAULT_SORT,
	// order: DEFAULT_ORDER,
});


function reducer(state = initialState, action = {}) {
	let updError;
	switch (action.type) {
		case EDIT_OPTIONS:
			return state.mergeIn(["options"], action.instance).set('currentPage', 1);
		case success(FETCH):
			if (state.get("list").find(e => e.get("errorId") === action.id)) {
				return updateItemInList(state, { errorId: action.data.errorId, viewed: true })
					.set("instance", ErrorInfo(action.data));
			} else {
				return state.set("instance", ErrorInfo(action.data));
			}
		case failure(FETCH):
			return state.set("instance", ErrorInfo());
		case success(FETCH_TRACE):
			return state.set("instanceTrace", List(action.data.trace)).set('sourcemapUploaded', action.data.sourcemapUploaded);
		case success(FETCH_LIST):
			const { data } = action;
			return state
				.set("totalCount", data ? data.total : 0)
				.set("list", List(data && data.errors).map(ErrorInfo)
					.filter(e => e.parentErrorId == null)
					.map(e => e.update("chart", chartWrapper)))
		case success(RESOLVE):
			updError = { errorId: action.id, status: RESOLVED, disabled: true };
			return updateItemInList(updateInstance(state, updError), updError);
		case success(UNRESOLVE):
			updError = { errorId: action.id, status: UNRESOLVED, disabled: true };
			return updateItemInList(updateInstance(state, updError), updError);
		case success(IGNORE):
			updError = { errorId: action.id, status: IGNORED, disabled: true };
			return updateItemInList(updateInstance(state, updError), updError);
		case success(TOGGLE_FAVORITE):
			return state.mergeIn([ "instance" ], { favorite: !state.getIn([ "instance", "favorite" ]) })
		case success(MERGE):
			const ids = action.ids.slice(1);
			return state.update("list", list => list.filter(e => !ids.includes(e.errorId)));
		case success(FETCH_NEW_ERRORS_COUNT):
			return state.set('stats', action.data);
		case UPDATE_KEY:
			return state.set(action.key, action.value);
		case UPDATE_CURRENT_PAGE:
			return state.set('currentPage', action.page);
	}
	return state;
}

export default mergeReducers(
	reducer,
	createRequestReducer({
		[ ROOT_KEY ]: FETCH_LIST,
		fetch: FETCH,
		fetchTrace: FETCH_TRACE,
		resolve: RESOLVE,
		unresolve: UNRESOLVE,
		ignore: IGNORE,
		merge: MERGE,
		toggleFavorite: TOGGLE_FAVORITE,
	}),
);


export function fetch(id) {
	return {
		id,
		types: array(FETCH),
		call: c => c.get(`/errors/${id}`),
	}
}

export function fetchTrace(id) {
	return {
		id,
		types: array(FETCH_TRACE),
		call: c => c.get(`/errors/${id}/sourcemaps`),
	}
}

export const fetchList = (params = {}, clear = false) => (dispatch, getState) => {
	params.page = getState().getIn(['errors', 'currentPage']);
	params.limit = PER_PAGE;

	const options = getState().getIn(['errors', 'options']).toJS();
	if (options.status === BOOKMARK) {
		options.bookmarked = true;
		options.status = 'all';
	}

	return dispatch({
		types: array(FETCH_LIST),
		call: client => client.post('/errors/search', { ...params, ...options }),
		clear,
		params: cleanParams(params),
	});
};

// export function fetchList(params = {}, clear = false) {
//   return {
//     types: array(FETCH_LIST),
//     call: client => client.post('/errors/search', params),
//     clear,
//     params: cleanParams(params),
//   };
// }

export function fetchBookmarks() {
	return {
		types: array(FETCH_LIST),
		call: client => client.post('/errors/search?favorite', {})
	}
}

export const resolve = (id) => (dispatch, getState) => {
	const list = getState().getIn(['errors', 'list']);
	const index = list.findIndex(e => e.get('errorId') === id);
	const error = list.get(index);
	if (error.get('status') === RESOLVED) return;

	return dispatch({
		types: array(RESOLVE),
		id,
		call: client => client.get(`/errors/${ id }/solve`),
	})
}

export const unresolve = (id) => (dispatch, getState) => {
	const list = getState().getIn(['errors', 'list']);
	const index = list.findIndex(e => e.get('errorId') === id);
	const error = list.get(index);
	if (error.get('status') === UNRESOLVED) return;

	return dispatch({
		types: array(UNRESOLVE),
		id,
		call: client => client.get(`/errors/${ id }/unsolve`),
	})
}

export const ignore = (id) => (dispatch, getState) => {
	const list = getState().getIn(['errors', 'list']);
	const index = list.findIndex(e => e.get('errorId') === id);
	const error = list.get(index);
	if (error.get('status') === IGNORED) return;

	return dispatch({
		types: array(IGNORE),
		id,
		call: client => client.get(`/errors/${ id }/ignore`),
	})
}

export function merge(ids) {
	return {
		types: array(MERGE),
		ids,
		call: client => client.post(`/errors/merge`, { errors: ids }),
	}
}

export function toggleFavorite(id) {
	return {
		types: array(TOGGLE_FAVORITE),
		id,
		call: client => client.get(`/errors/${ id }/favorite`),
	}
}

export function fetchNewErrorsCount(params = {}) {
	return {
		types: array(FETCH_NEW_ERRORS_COUNT),
		call: client => client.get(`/errors/stats`, params),
	}
}

export const updateCurrentPage = reduceThenFetchResource((page) => ({
    type: UPDATE_CURRENT_PAGE,
    page,
}));

export const editOptions = reduceThenFetchResource((instance) => ({ 
	type: EDIT_OPTIONS,
	instance
}));
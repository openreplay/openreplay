import { List, Map } from 'immutable';
import { fetchListType, fetchType, saveType, removeType, editType } from './funcTools/crud';
import { createRequestReducer, ROOT_KEY } from './funcTools/request';
import { array, success, mergeReducers } from './funcTools/tools';
import Filter from 'Types/filter';
import SavedFilter from 'Types/filter/savedFilter';
import { errors as errorsRoute, isRoute } from 'App/routes';
import { fetchList as fetchSessionList, fetchAutoplayList } from './sessions';
import { fetchList as fetchErrorsList } from './errors';
import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import { filtersMap, liveFiltersMap, generateFilterOptions } from 'Types/filter/newFilter';
import { DURATION_FILTER } from 'App/constants/storageKeys';
import Period, { CUSTOM_RANGE } from 'Types/app/period';

const ERRORS_ROUTE = errorsRoute();

const name = 'search';
const idKey = 'searchId';
const PER_PAGE = 10;

const FETCH_LIST = fetchListType(name);
const FETCH_FILTER_SEARCH = fetchListType(`${name}/FILTER_SEARCH`);
const FETCH = fetchType(name);
const SAVE = saveType(name);
const EDIT = editType(name);
const EDIT_SAVED_SEARCH = editType(`${name}/SAVED_SEARCH`);
const REMOVE = removeType(name);
const APPLY_SAVED_SEARCH = `${name}/APPLY_SAVED_SEARCH`;
const CLEAR_SEARCH = `${name}/CLEAR_SEARCH`;
const UPDATE = `${name}/UPDATE`;
const APPLY = `${name}/APPLY`;
const SET_ALERT_METRIC_ID = `${name}/SET_ALERT_METRIC_ID`;
const UPDATE_CURRENT_PAGE = `${name}/UPDATE_CURRENT_PAGE`;
const SET_ACTIVE_TAB = `${name}/SET_ACTIVE_TAB`;
const SET_SCROLL_POSITION = `${name}/SET_SCROLL_POSITION`;

const REFRESH_FILTER_OPTIONS = 'filters/REFRESH_FILTER_OPTIONS';
const CHECK_LATEST = fetchListType(`${name}/CHECK_LATEST`);
const UPDATE_LATEST_REQUEST_TIME = 'filters/UPDATE_LATEST_REQUEST_TIME'

// function chartWrapper(chart = []) {
//     return chart.map((point) => ({ ...point, count: Math.max(point.count, 0) }));
// }

// const savedSearchIdKey = 'searchId';
// const updateItemInList = createListUpdater(savedSearchIdKey);
// const updateInstance = (state, instance) =>
//     state.getIn(['savedSearch', savedSearchIdKey]) === instance[savedSearchIdKey] ? state.mergeIn(['savedSearch'], SavedFilter(instance)) : state;

const initialState = Map({
    filterList: generateFilterOptions(filtersMap),
    filterListLive: generateFilterOptions(liveFiltersMap),
    list: List(),
    latestRequestTime: null,
    latestList: List(),
    alertMetricId: null,
    instance: new Filter({ filters: [] }),
    savedSearch: new SavedFilter({}),
    filterSearchList: {},
    currentPage: 1,
    pageSize: PER_PAGE,
    activeTab: { name: 'All', type: 'all' },
    scrollY: 0,
});

// Metric - Series - [] - filters
function reducer(state = initialState, action = {}) {
    switch (action.type) {
        case REFRESH_FILTER_OPTIONS:
            return state.set('filterList', generateFilterOptions(filtersMap)).set('filterListLive', generateFilterOptions(liveFiltersMap));
        case EDIT:
            return state.mergeIn(['instance'], action.instance).set('currentPage', 1);
        case APPLY:
            const _state = action.fromUrl ? state.set('instance', Filter(action.filter)) : state.mergeIn(['instance'], action.filter);
            if (action.resetPage) {
                _state.set('currentPage', 1)
            }
            return _state
        case success(FETCH):
            return state.set('instance', action.data);
        case success(FETCH_LIST):
            const { data } = action;
            return state.set(
                'list',
                List(data.map(SavedFilter)).sortBy((i) => i.searchId)
            );
        case UPDATE_LATEST_REQUEST_TIME:
            return state.set('latestRequestTime', Date.now()).set('latestList', [])
        case success(CHECK_LATEST):
            return state.set('latestList', action.data)
        case success(FETCH_FILTER_SEARCH):
            const groupedList = action.data.reduce((acc, item) => {
                const { projectId, type, value } = item;
                const key = type;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push({ projectId, value });
                return acc;
            }, {});
            return state.set('filterSearchList', groupedList);
        case APPLY_SAVED_SEARCH:
            return state.set('savedSearch', action.filter);
        case CLEAR_SEARCH:
            return state.set('savedSearch', new SavedFilter({}));
        case EDIT_SAVED_SEARCH:
            return state.mergeIn(['savedSearch'], action.instance);
        case UPDATE_CURRENT_PAGE:
            return state.set('currentPage', action.page);
        case SET_ACTIVE_TAB:
            return state.set('activeTab', action.tab).set('currentPage', 1);
        case SET_SCROLL_POSITION:
            return state.set('scrollY', action.scrollPosition);
    }
    return state;
}

export default mergeReducers(
    reducer,
    createRequestReducer({
        [ROOT_KEY]: FETCH_LIST,
        fetch: FETCH,
        fetchFilterSearch: FETCH_FILTER_SEARCH,
    })
);

const checkValues = (key, value) => {
    if (key === FilterKey.DURATION) {
        return value[0] === '' || value[0] === null ? [0, value[1]] : value;
    }
    return value.filter((i) => i !== '' && i !== null);
};

export const checkFilterValue = (value) => {
    return Array.isArray(value) ? (value.length === 0 ? [''] : value) : [value];
};

export const filterMap = ({ category, value, key, operator, sourceOperator, source, custom, isEvent, filters, sort, order }) => ({
    value: checkValues(key, value),
    custom,
    type: category === FilterCategory.METADATA ? FilterKey.METADATA : key,
    operator,
    source: category === FilterCategory.METADATA ? key : source,
    sourceOperator,
    isEvent,
    filters: filters ? filters.map(filterMap) : [],
});


const getFilters = (state) => {
    const filter = state.getIn(['search', 'instance']).toData();
    const activeTab = state.getIn(['search', 'activeTab']);
    if (activeTab.type !== 'all' && activeTab.type !== 'bookmark' && activeTab.type !== 'vault') {
        const tmpFilter = filtersMap[FilterKey.ISSUE];
        tmpFilter.value = [activeTab.type];
        filter.filters = filter.filters.concat(tmpFilter);
    }

    if (activeTab.type === 'bookmark' || activeTab.type === 'vault') {
        filter.bookmarked = true;
    }

    filter.filters = filter.filters.map(filterMap);

    // duration filter from local storage
    if (!filter.filters.find((f) => f.type === FilterKey.DURATION)) {
        const durationFilter = JSON.parse(localStorage.getItem(DURATION_FILTER) || '{"count": 0}');
        let durationValue = parseInt(durationFilter.count);
        if (durationValue > 0) {
            const value = [0];
            durationValue = durationFilter.countType === 'min' ? durationValue * 60 * 1000 : durationValue * 1000;
            if (durationFilter.operator === '<') {
                value[0] = durationValue;
            } else if (durationFilter.operator === '>') {
                value[1] = durationValue;
            }

            filter.filters = filter.filters.concat({
                type: FilterKey.DURATION,
                operator: 'is',
                value,
            });
        }
    }

    return filter;
}

export const reduceThenFetchResource =
    (actionCreator) =>
    (...args) =>
    (dispatch, getState) => {
        dispatch(actionCreator(...args));
        const activeTab = getState().getIn(['search', 'activeTab']);
        if (['notes', 'flags'].includes(activeTab.type)) return;
        
        const filter = getFilters(getState());
        filter.limit = PER_PAGE;
        filter.page = getState().getIn(['search', 'currentPage']);

        const forceFetch = filter.filters.length === 0 || args[1] === true;

        // reset the timestamps to latest
        if (filter.rangeValue !== CUSTOM_RANGE) {
            const period = new Period({ rangeName: filter.rangeValue })
            const newTimestamps = period.toJSON();
            filter.startDate = newTimestamps.startDate
            filter.endDate = newTimestamps.endDate
        }

        dispatch(updateLatestRequestTime())
        return isRoute(ERRORS_ROUTE, window.location.pathname) ? dispatch(fetchErrorsList(filter)) : dispatch(fetchSessionList(filter, forceFetch));
    };

export const edit = reduceThenFetchResource((instance) => ({
    type: EDIT,
    instance,
}));

export const editDefault = (instance) => ({
  type: EDIT,
  instance,
});

export const setActiveTab = reduceThenFetchResource((tab) => ({
    type: SET_ACTIVE_TAB,
    tab,
}));

export const remove = (id) => (dispatch, getState) => {
    return dispatch({
        types: REMOVE.array,
        call: (client) => client.delete(`/saved_search/${id}`),
        id,
    }).then(() => {
        dispatch(applySavedSearch(new SavedFilter({})));
        dispatch(fetchList());
    });
};

// export const remove = createRemove(name, (id) => `/saved_search/${id}`);

export const applyFilter = reduceThenFetchResource((filter, force = false) => ({
    type: APPLY,
    filter,
    force,
}));

export const updateFilter = (filter, force = false, resetPage = true) => ({
    type: APPLY,
    filter,
    force,
    resetPage,
});

export const updateCurrentPage = reduceThenFetchResource((page) => ({
    type: UPDATE_CURRENT_PAGE,
    page,
}));

export const applySavedSearch = (filter) => (dispatch, getState) => {
    dispatch(edit({ filters: filter ? filter.filter.filters : [] }));
    return dispatch({
        type: APPLY_SAVED_SEARCH,
        filter,
    });
};

export const fetchSessions = (filter, force = false) => (dispatch, getState) => {
    const _filter = filter ? filter : getState().getIn(['search', 'instance']);
    return dispatch(applyFilter(_filter, force));
};

export const updateSeries = (index, series) => ({
    type: UPDATE,
    index,
    series,
});

export function fetch(id) {
    return {
        id,
        types: array(FETCH),
        call: (c) => c.get(`/errors/${id}`),
    };
}

export const save = (id, rename = false) => (dispatch, getState) => {
    const filter = getState().getIn(['search', 'instance']).toData();
    // filter.filters = filter.filters.map(filterMap);
    const isNew = !id;

    const instance = getState().getIn(['search', 'savedSearch']).toData();
    const newInstance = rename ? instance : { ...instance, filter };
    newInstance.filter.filters = newInstance.filter.filters.map(filterMap);
    return dispatch({
        types: SAVE.array,
        call: (client) => client.post(isNew ? '/saved_search' : `/saved_search/${id}`, newInstance),
    }).then(() => {
        dispatch(fetchList()).then(() => {
            if (isNew) {
                const lastSavedSearch = getState().getIn(['search', 'list']).last();
                dispatch(applySavedSearch(lastSavedSearch));
            }
        });
    });
};

export function fetchList() {
    return {
        types: array(FETCH_LIST),
        call: (client) => client.get(`/saved_search`),
    };
}

export function setAlertMetricId(id) {
    return {
        type: SET_ALERT_METRIC_ID,
        id,
    };
}

export function fetchFilterSearch(params) {
    return {
        types: FETCH_FILTER_SEARCH.array,
        call: (client) => client.get('/events/search', params),
        params,
    };
}

export const clearSearch = () => (dispatch, getState) => {
    const instance = getState().getIn(['search', 'instance']);
    dispatch(
        edit(
            new Filter({
              rangeValue: instance.rangeValue,
              startDate: instance.startDate,
              endDate: instance.endDate,
              filters: [],
            })
        )
    );
    return dispatch({
        type: CLEAR_SEARCH,
    });
};

export const hasFilterApplied = (filters, filter) => {
    return !filter.isEvent && filters.some((f) => f.key === filter.key);
};

export const getAppliedFilterIndex = (filters, filterToFind) => {
    if (!filterToFind.isEvent) {
      return filters.findIndex((filter) => filter.key === filterToFind.key);
    }
    return -1;
  };
  
export const addFilter = (filter) => (dispatch, getState) => {
  const instance = getState().getIn(['search', 'instance']);
  const filters = instance.get('filters');
  const index = getAppliedFilterIndex(filters, filter);

  filter.value = checkFilterValue(filter.value);

  filter.filters = filter.filters
    ? filter.filters.map((subFilter) => ({
        ...subFilter,
        value: checkFilterValue(subFilter.value),
      }))
    : null;

  if (index !== -1) {
    const oldFilter = filters.get(index);
    const updatedFilter = {
      ...oldFilter,
      value: oldFilter.value.concat(filter.value),
    };

    const updatedFilters = filters.set(index, updatedFilter);
    return dispatch(edit(instance.set('filters', updatedFilters)));
  } else {
    const updatedFilters = filters.push(filter);
    return dispatch(edit(instance.set('filters', updatedFilters)));
  }
};

export const addFilterByKeyAndValue =
    (key, value, operator = undefined, sourceOperator = undefined, source = undefined) =>
    (dispatch, getState) => {
        let defaultFilter = {...filtersMap[key]};
        defaultFilter.value = value;
        if (operator) {
            defaultFilter.operator = operator;
        }
        if (defaultFilter.hasSource && source && sourceOperator) {
            defaultFilter.sourceOperator = sourceOperator;
            defaultFilter.source = source;
        }

        dispatch(addFilter(defaultFilter));
    };

export const editSavedSearch = (instance) => {
    return {
        type: EDIT_SAVED_SEARCH,
        instance,
    };
};

export const refreshFilterOptions = () => {
    return {
        type: REFRESH_FILTER_OPTIONS,
    };
};

export const setScrollPosition = (scrollPosition) => {
    return {
        type: SET_SCROLL_POSITION,
        scrollPosition,
    };
};

export const updateLatestRequestTime = () => {
    return {
        type: UPDATE_LATEST_REQUEST_TIME
    }
}

export const checkForLatestSessions = () => (dispatch, getState) => {
    const state = getState();
    const filter = getFilters(state);
    const latestRequestTime = state.getIn(['search', 'latestRequestTime'])
    if (!!latestRequestTime) {
        const period = new Period({ rangeName: CUSTOM_RANGE, start: latestRequestTime, end: Date.now() })
        const newTimestamps = period.toJSON();
        filter.startDate = newTimestamps.startDate
        filter.endDate = newTimestamps.endDate
    }
    
    return dispatch({
        types: array(CHECK_LATEST),
        call: (client) => client.post(`/sessions/search/ids`, filter),
    });
}

export const fetchAutoplaySessions = (page) => (dispatch, getState) => {
    const filter = getFilters(getState());
    filter.page = page;
    filter.limit = PER_PAGE;
    return dispatch(fetchAutoplayList(filter));
}
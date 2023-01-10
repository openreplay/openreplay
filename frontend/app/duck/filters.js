import { List, Map, Set } from 'immutable';
import { errors as errorsRoute, isRoute } from "App/routes";
import Filter from 'Types/filter';
import SavedFilter from 'Types/filter/savedFilter';
import Event from 'Types/filter/event';
import CustomFilter, { KEYS } from 'Types/filter/customFilter';
import withRequestState, { RequestTypes } from './requestStateCreator';
import { fetchList as fetchSessionList } from './sessions';
import { fetchList as fetchErrorsList } from './errors';
import { editType } from './funcTools/crud/types';

const ERRORS_ROUTE = errorsRoute();

const FETCH_LIST = new RequestTypes('filters/FETCH_LIST');
const FETCH_FILTER_OPTIONS = new RequestTypes('filters/FETCH_FILTER_OPTIONS');
const SET_FILTER_OPTIONS = 'filters/SET_FILTER_OPTIONS';
const SAVE = new RequestTypes('filters/SAVE');
const REMOVE = new RequestTypes('filters/REMOVE');
const EDIT = editType('funnel/EDIT');

const SET_SEARCH_QUERY = 'filters/SET_SEARCH_QUERY';
const SET_ACTIVE = 'filters/SET_ACTIVE';
const SET_ACTIVE_KEY = 'filters/SET_ACTIVE_KEY';
const APPLY = 'filters/APPLY';
const ADD_CUSTOM_FILTER = 'filters/ADD_CUSTOM_FILTER';
const REMOVE_CUSTOM_FILTER = 'filters/REMOVE_CUSTOM_FILTER';
const RESET_KEY = 'filters/RESET_KEY';
const ADD_EVENT = 'filters/ADD_EVENT';
const EDIT_EVENT = 'filters/EDIT_EVENT';
const REMOVE_EVENT = 'filters/REMOVE_EVENT';
const MOVE_EVENT = 'filters/MOVE_EVENT';
const CLEAR_EVENTS = 'filters/CLEAR_EVENTS';
const TOGGLE_FILTER_MODAL = 'filters/TOGGLE_FILTER_MODAL';
const ADD_ATTRIBUTE = 'filters/ADD_ATTRIBUTE';
const EDIT_ATTRIBUTE = 'filters/EDIT_ATTRIBUTE';
const REMOVE_ATTRIBUTE = 'filters/REMOVE_ATTRIBUTE';
const SET_ACTIVE_FLOW = 'filters/SET_ACTIVE_FLOW';
const UPDATE_VALUE = 'filters/UPDATE_VALUE';

const initialState = Map({
  instance: Filter(),
  activeFilter: null,
  list: List(),
  appliedFilter: Filter(),
  activeFilterKey: null,
  saveModalOpen: false,
  customFilters: Map(),
  searchQuery: '',
  activeFlow: null,
  filterOptions: Map({
    USEROS: Set(),
    USERBROWSER: Set(),
    USERDEVICE: Set(),
    REFERRER: Set(),
    USERCOUNTRY: Set(),
    PLATFORM: Set([
      {label: 'Platform', type: KEYS.PLATFORM, key: KEYS.PLATFORM, value: 'desktop', isFilter: true},
      {label: 'Platform', type: KEYS.PLATFORM, key: KEYS.PLATFORM, value: 'mobile', isFilter: true},
      {label: 'Platform', type: KEYS.PLATFORM, key: KEYS.PLATFORM, value: 'tablet', isFilter: true},
    ]),
  }),
});

let hasFilterOptions = false;

const updateList = (state, instance) => state.update('list', (list) => {
  const index = list.findIndex(item => item.filterId === instance.filterId);
  return (index >= 0
    ? list.mergeIn([ index ], instance)
    : list.push(instance)
  );
});

const reducer = (state = initialState, action = {}) => {
  let optionsMap = null;
  switch (action.type) {
    case EDIT:
      return state.mergeIn([ 'appliedFilter' ], action.instance);
    case FETCH_FILTER_OPTIONS.SUCCESS:
      optionsMap = state.getIn(['filterOptions', action.key]).map(i => i.value).toJS();
      return state.mergeIn(['filterOptions', action.key], Set(action.data.filter(i => !optionsMap.includes(i.value))));
    case SET_FILTER_OPTIONS:
      optionsMap = state.getIn(['filterOptions', action.key]);
      optionsMap = optionsMap ? optionsMap.filter(i => i !== undefined).map(i => i.value).toJS() : []
      return state.mergeIn(['filterOptions', action.key], Set(action.filterOption.filter(i => !optionsMap.includes(i.value))));
    case FETCH_LIST.SUCCESS:
      const flows = List(action.data).map(SavedFilter)
      let _state = state.set('list', flows)
      
      if (!hasFilterOptions) {
        const tmp = {}
        flows.forEach(i => {
          i.filter.filters.forEach(f => {
            if (f.type && f.value && f.value.length > 0) {
              tmp[f.type] = tmp[f.type] ? tmp[f.type].concat(f.value) : f.value
            }
          })
        });

        Object.keys(tmp).forEach(f => {
          const options =  List(tmp[f]).map(i => ({type: i, value: i})) // TODO should get the unique items
          _state = _state.mergeIn(['filterOptions', f], options);
        })
      }
      hasFilterOptions = true
      return _state;
    case SAVE.SUCCESS:
      return updateList(state, SavedFilter(action.data))
        .set('saveModalOpen', false);
    case REMOVE.SUCCESS:
      return state.update(
        'list',
        list => list
          .filter(filter => filter.filterId !== action.id),
      ).set('activeFilter', null);
    case SET_ACTIVE:
      return state.set('activeFilter', action.filter);
    case SET_ACTIVE_FLOW:
      return state.set('activeFlow', action.flow);
    case SET_ACTIVE_KEY:
      return state.set('activeFilterKey', action.filterKey);
    case APPLY:
      return action.fromUrl 
        ? state.set('appliedFilter', 
            Filter(action.filter)
            .set('events', state.getIn([ 'appliedFilter', 'events' ]))
          )
        : state.mergeIn([ 'appliedFilter' ], action.filter);
    case ADD_CUSTOM_FILTER:
      return state.update('customFilters', vars => vars.set(action.filter, action.value));
    case REMOVE_CUSTOM_FILTER:
      return state.update('customFilters', vars => vars.remove(action.filterKey));
    case RESET_KEY:
      if (action.key === 'rangeValue') {
        return state
          .removeIn([ 'appliedFilter', 'rangeValue' ])
          .removeIn([ 'appliedFilter', 'startDate' ])
          .removeIn([ 'appliedFilter', 'endDate' ]);
      } else if (action.key === 'duration') {
        return state
          .removeIn([ 'appliedFilter', 'minDuration' ])
          .removeIn([ 'appliedFilter', 'maxDuration' ]);
      }
      return state.removeIn([ 'appliedFilter', action.key ]);
    case ADD_EVENT:
      // const eventValue = action.event.type === TYPES.INPUT ? (action.event.target ? action.event.target.label : '') : action.event.value;
      const eventValue = action.event.value;
      const event = Event(action.event).set('value', eventValue);
      if (action.index >= 0) // replacing an event
        return state.setIn([ 'appliedFilter', 'events', action.index ], event)
      else
        return state.updateIn([ 'appliedFilter', 'events' ], list => action.single 
          ? List([ event ])
          : list.push(event));
    case REMOVE_EVENT:
      return state.removeIn([ 'appliedFilter', 'events', action.index ]);
    case EDIT_EVENT:
      return state.mergeIn([ 'appliedFilter', 'events', action.index], action.filter);
    case TOGGLE_FILTER_MODAL:
      return state.set('saveModalOpen', action.show);
    case MOVE_EVENT:
      const { fromI, toI } = action;
      return state
        .updateIn([ 'appliedFilter', 'events' ], list =>
          list.remove(fromI).insert(toI, list.get(fromI)));
    case CLEAR_EVENTS:
      return state.setIn([ 'appliedFilter', 'events' ], List())
        .setIn([ 'appliedFilter', 'filters' ], List())
        .set('searchQuery', '');
    
    case ADD_ATTRIBUTE:
      const filter = CustomFilter(action.filter);

      if (action.index >= 0) // replacing the filter
        return state.setIn([ 'appliedFilter', 'filters', action.index], filter);
      else
        return state.updateIn([ 'appliedFilter', 'filters'], filters => filters.push(filter));
        
    case EDIT_ATTRIBUTE:
      return state.setIn([ 'appliedFilter', 'filters', action.index, action.key ], action.value );
    case REMOVE_ATTRIBUTE:
      return state.removeIn([ 'appliedFilter', 'filters', action.index ]);
    case SET_SEARCH_QUERY:
      return state.set('searchQuery', action.query);
    case UPDATE_VALUE:
      return state.setIn([ 'appliedFilter', action.filterType, action.index, 'value' ], action.value);
    default:
      return state;
  }
};

export default withRequestState({
  _: [ REMOVE ],
  fetchListRequest: FETCH_LIST,
  saveRequest: SAVE,
  fetchFilterOptions: FETCH_FILTER_OPTIONS,
}, reducer);

const eventMap = ({value, searchType, key, operator, source, custom}) => ({value, type: searchType, key, operator, source, custom});
const filterMap = ({value, type, key, operator, source, custom }) => ({value: Array.isArray(value) ? value: [value], custom, type, key, operator, source});
const reduceThenFetchResource = actionCreator => (...args) => (dispatch, getState) => {
  dispatch(actionCreator(...args));
  const appliedFilters = getState().getIn([ 'filters', 'appliedFilter' ]);
  const filter = appliedFilters
    .update('events', list => list.map(event => event.set('value', event.value || '*')).map(eventMap))
    .set('strict', true) // Temp backend issue
    .toJS();
  filter.filters = getState().getIn([ 'filters', 'appliedFilter', 'filters' ])
    .map(filterMap).toJS();

    // Hello AGILE!
  return isRoute(ERRORS_ROUTE, window.location.pathname)
    ? dispatch(fetchErrorsList(filter))
    : dispatch(fetchSessionList(filter));
}

export function editAttribute(index, key, value) {
  return {
    type: EDIT_ATTRIBUTE,
    index,
    key,
    value,
  };
}

export function addAttribute(filter, index) {
  return {
    type: ADD_ATTRIBUTE,
    filter,
    index
  };
}

export function removeAttribute(index) {
  return {
    type: REMOVE_ATTRIBUTE,
    index,
  };
}

export function fetchList(range) {
  return {
    types: FETCH_LIST.toArray(),
    call: client => client.get(`/saved_search`),
  };
}

export function fetchFilterOptions(filter, q) {
  return {
    types: FETCH_FILTER_OPTIONS.toArray(),
    call: client => client.get('/sessions/filters/search', { q, type: filter.type }),
    key: filter.key
  };
}

export function setFilterOption(key, filterOption) {
  return {
    type: SET_FILTER_OPTIONS,
    key,
    filterOption
  }
}

export function save(instance) {
  return {
    types: SAVE.toArray(),
    call: client => client.post('/saved_search', instance.toData()),
    instance,
  };
}

export function remove(id) {
  return {
    types: REMOVE.toArray(),
    call: client => client.delete(`/filters/${ id }`),
    id,
  };
}

export function setActive(filter) {
  return {
    type: SET_ACTIVE,
    filter,
  };
}

export function setActiveFlow(flow) {
  return {
    type: SET_ACTIVE_FLOW,
    flow,
  };
}

export function setActiveKey(filterKey) {
  return {
    type: SET_ACTIVE_KEY,
    filterKey,
  };
}

export const addCustomFilter = reduceThenFetchResource((filter, value) => ({
  type: ADD_CUSTOM_FILTER,
  filter,
  value,
}));

export const removeCustomFilter = reduceThenFetchResource(filterKey => ({
  type: REMOVE_CUSTOM_FILTER,
  filterKey,
}));

export const applyFilter = reduceThenFetchResource((filter, fromUrl=false) => ({
  type: APPLY,
  filter,
  fromUrl,
}));

export const applySavedFilter = reduceThenFetchResource((filter, fromUrl=false) => ({
  type: APPLY,
  filter,
  fromUrl,
}));

export const resetFilterKey = reduceThenFetchResource(key => ({
  type: RESET_KEY,
  key,
}));

export const clearEvents = reduceThenFetchResource(() => ({
  type: CLEAR_EVENTS,
}));

export function addEvent(event, single = false, index) {
  return {
    type: ADD_EVENT,
    event,
    single,
    index
  };
}

export function removeEvent(index) {
  return {
    type: REMOVE_EVENT,
    index,
  };
}

export function moveEvent(fromI, toI) {
  return {
    type: MOVE_EVENT,
    fromI,
    toI,
  };
}

export function editEvent(index, filter) {
  return {
    type: EDIT_EVENT,
    index,
    filter
  };
}

export function toggleFilterModal(show) {
  return {
    type: TOGGLE_FILTER_MODAL,
    show,
  };
}

export function setSearchQuery(query) {
  return {
    type: SET_SEARCH_QUERY,
    query
  }
}

export const edit = instance => {
  return {
    type: EDIT,
    instance,
  }
};

// filterType: 'events' or 'filters'
export const updateValue  = (filterType, index, value) => {
  return {
    type: UPDATE_VALUE,
    filterType, 
    index,
    value
  }
}

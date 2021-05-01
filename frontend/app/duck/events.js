import { List, Map, Set } from 'immutable';
import withRequestState, { RequestTypes } from 'Duck/requestStateCreator';
import Event from 'Types/filter/event';
import CustomFilter from 'Types/filter/customFilter';
import { KEYS } from 'Types/filter/customFilter';
import logger from 'App/logger';
import { countries } from 'App/constants';
import { getRE } from 'App/utils';

const FETCH_LIST = new RequestTypes('events/FETCH_LIST');
const TOGGLE_SELECT = 'events/TOGGLE_SELECT';
const SET_SELECTED = 'events/SET_SELECTED';

const countryOptions = Object.keys(countries).map(c => ({filterKey: KEYS.USER_COUNTRY, label: KEYS.USER_COUNTRY, type: KEYS.USER_COUNTRY, value: c, actualValue: countries[c], isFilter: true }));

const initialState = Map({
  list: List(),
  store: Set(),

  // replace?
  selected: Set(),
});

const filterKeys = ['METADATA', KEYS.USERID, KEYS.USER_COUNTRY, KEYS.USER_BROWSER, KEYS.USER_OS, KEYS.USER_DEVICE, KEYS.REFERRER]

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case FETCH_LIST.SUCCESS: {
      const regCountry = getRE(action.params.q, 'i');
      const countryOptionsFiltered = List(countryOptions).filter(({ actualValue }) => regCountry.test(actualValue)).take(5);

      const eventList = List(action.data).concat(countryOptionsFiltered).map(item => (
        filterKeys.includes(item.type) ?
          CustomFilter({...item, isFilter: true }) :
          Event({...item, key: item.type, filterKey: item.type, label: item.type}) )
      );

      return state
        .set('list', eventList)
        .update('store', store => store.concat(eventList));
    }
    // TODO: use ids. or make a set-hoc?
    case TOGGLE_SELECT: {
      const { event, flag } = action;
      const shouldBeInSet = typeof flag === 'boolean'
        ? flag
        : !state.get('selected').contains(event);
      return state.update('selected', set => (shouldBeInSet
        ? set.add(event)
        : set.remove(event)));
    }
    case SET_SELECTED:
      return state.set('selected', Set(action.events));
  }
  return state;
};

export default withRequestState(FETCH_LIST, reducer);

export function fetchList(params) {
  return {
    types: FETCH_LIST.toArray(),
    call: client => client.get('/events/search', params),
    params,
  };
}

export function toggleSelect(event, flag) {
  return {
    type: TOGGLE_SELECT,
    event,
    flag,
  };
}

export function setSelected(events) {
  return {
    type: SET_SELECTED,
    events,
  };
}

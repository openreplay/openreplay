import { List, Map, getIn } from 'immutable';
import { 
  WIDGET_LIST,
  WIDGET_MAP,
  WIDGET_KEYS,
} from 'Types/dashboard';
import Period, { LAST_24_HOURS, LAST_7_DAYS } from 'Types/app/period';
import { ALL } from 'Types/app/platform';
import { createRequestReducer } from './funcTools/request';
import { mergeReducers, success, array } from './funcTools/tools';
import { RequestTypes } from 'Duck/requestStateCreator';

const SET_PERIOD = 'dashboard/SET_PERIOD';
const SET_PLATFORM = 'dashboard/SET_PLATFORM';
const SET_SHOW_ALERTS = 'dashboard/SET_SHOW_ALERTS';
const SET_COMPARING = 'dashboard/SET_COMPARING';
const SET_FILTERS = 'dashboard/SET_FILTERS';
const REMOVE_FILTER = 'dashboard/REMOVE_FILTER';
const CLEAR_FILTERS = 'dashboard/CLEAR_FILTERS';
const FETCH_PERFORMANCE_SEARCH = 'dashboard/FETCH_PERFORMANCE_SEARCH';
const FETCH_PERFORMANCE_SEARCH_SUCCESS = success(FETCH_PERFORMANCE_SEARCH);
const ON_BOARD = new RequestTypes('plan/ON_BOARD');

const FETCH_META_OPTIONS = 'dashboard/FETCH_META_OPTIONS';
const FETCH_META_OPTIONS_SUCCESS = success(FETCH_META_OPTIONS);

export const FETCH_WIDGET_TYPES = {};
WIDGET_KEYS.forEach(key => {
  FETCH_WIDGET_TYPES[ key ] = `dashboard/FETCH_WIDGET-${ key }-`; //workaround TODO
  FETCH_WIDGET_TYPES[ '_' + key ] = `dashboard/FETCH_WIDGET-${ '_' + key }-`; //workaround TODO
});
const FETCH_WIDGET_SUCCESS_LIST = WIDGET_KEYS.map(key => success(FETCH_WIDGET_TYPES[ key ])).concat(WIDGET_KEYS.map(key => success(FETCH_WIDGET_TYPES[ '_' + key ])));

const widgetInitialStates = {};
WIDGET_LIST.forEach(({ key, dataWrapper }) => { 
  widgetInitialStates[ key ] = dataWrapper();
  widgetInitialStates[ '_' + key ] = dataWrapper(); 
});

const initialState = Map({
  ...widgetInitialStates,
  period: Period({ rangeName: LAST_7_DAYS }),
  periodCompare: Period({ rangeName: LAST_7_DAYS }),
  filters: List(),
  filtersCompare: List(),
  platform: ALL,
  performanceChart: [],
  showAlerts: false,
  comparing: false,
  metaOptions: [],
  boarding: List(),
  boardingCompletion: 0,
});

const getValue = ({ avgPageLoadTime, avgRequestLoadTime, avgImageLoadTime }) =>  avgPageLoadTime || avgRequestLoadTime || avgImageLoadTime;

const getCountry = item => {
  switch(item.location) {
    case 'us-east-2':
    case 'us-east-1':
      return {
        userCountry: 'US',
        avg: Math.round(item.avg)
      };
    case 'europe-west1-d':
      return {
        userCountry: 'EU',
        avg: Math.round(item.avg)
      };
    default:
      return '';
  }
}

const reducer = (state = initialState, action = {}) => {
  let isCompare;
  if (FETCH_WIDGET_SUCCESS_LIST.includes(action.type)) {
    const key = action.type.split('-')[ 1 ];
    const _key = key.startsWith('_') ? key.replace('_', '') : key;    
    const dataWrapper = WIDGET_LIST.find(w => w.key === _key).dataWrapper;
    return state.set(action.compare ? key : key, dataWrapper(action.data, action.period));
  }
  switch (action.type) {
    case SET_PERIOD:
      return state.set(action.compare ? 'periodCompare' : 'period', Period(action.period));
    case SET_PLATFORM:
      return state.set("platform", action.platform);
    case FETCH_PERFORMANCE_SEARCH_SUCCESS:
      const timestamps = List(getIn(action.data, [ 0, "chart" ])).map(({ timestamp }) => ({ timestamp }));
      const chart = List(action.data)
        .reduce((zippedChartData, resource, index) => zippedChartData
          .zipWith((chartPoint, resourcePoint) => ({
            ...chartPoint,
            [ `resource${ index }` ]: getValue(resourcePoint),
          }), List(resource.chart)), 
          timestamps
        )
        .toJS();
      return state.set('performanceChart', formatChartTime(chart, state.get("period")));
    case SET_SHOW_ALERTS:
      return state.set('showAlerts', action.state);
    case SET_COMPARING:
      return state.set('comparing', action.status)
        .set('filtersCompare', List()).set('periodCompare', state.get("period"));
    case SET_FILTERS:
      isCompare = action.key === 'compare';
      return state.update(isCompare ? 'filtersCompare' : 'filters', list => list.push(action.filter))
    case REMOVE_FILTER:
      isCompare = action.key === 'compare';
      return state.update(
        isCompare ? 'filtersCompare' : 'filters', 
        list => list.filter(filter => filter.key !== action.filterKey)
      );
    case CLEAR_FILTERS:
      isCompare = action.key === 'compare';
      return state.set(isCompare ? 'filtersCompare' : 'filters', List());

    case FETCH_META_OPTIONS_SUCCESS:
      return state.set('metaOptions', action.data.map(i => ({ ...i, icon: 'id-card', placeholder: 'Search for ' + i.name})));
    
    case ON_BOARD.SUCCESS:
      const tasks = List(action.data);
      const completion = tasks.filter(task => task.done).size * 100 / tasks.size;
      return state.set('boarding', tasks).set('boardingCompletion', Math.trunc(completion));
  }
  return state;
};

export default mergeReducers(
  reducer,
  createRequestReducer({
    fetchWidget: FETCH_WIDGET_TYPES,
    performanceSearchRequest: FETCH_PERFORMANCE_SEARCH,
  }),
);

export function setPeriod(compare, period) {
  return {
    type: SET_PERIOD,
    compare,
    period,
  }
}

export function setPlatform(platform) {
  return {
    type: SET_PLATFORM,
    platform,
  };
}

export function setComparing(status) {
  return {
    type: SET_COMPARING,
    status,
  };
}

export function setFilters(key, filter) {
  return {
    type: SET_FILTERS,
    key,
    filter
  };
}

export function removeFilter(key, filterKey) {
  return {
    type: REMOVE_FILTER,
    key,
    filterKey
  };
}

export function clearFilters(key) {
  return {
    type: CLEAR_FILTERS,
    key
  };
}


const toUnderscore = s => s.split(/(?=[A-Z])/).join('_').toLowerCase();
export function fetchWidget(widgetKey, period, platform, _params, filters) {
  let path = `/dashboard/${ toUnderscore(widgetKey) }`;
  const widget = WIDGET_MAP[widgetKey];  
  const params = period.toTimestamps();
  params.filters = filters ? 
    filters.map(f => ({key: f.key, value: f.value ? f.value : f.text})).toJS() : [];
  // if (platform !== ALL) {
  //   params.platform = platform;
  // }  
  
  return {
    types: array(FETCH_WIDGET_TYPES[ _params.compare ? '_' + widgetKey : widgetKey ]),
    call: client => client.post(path, {...params, ..._params}),
    period,
    compare: _params && _params.compare
  };
}

export function fetchPerformanseSearch(params) {
  return {
    types: array(FETCH_PERFORMANCE_SEARCH),
    call: client => client.post('/dashboard/performance/search', params),
  };
}

export function setShowAlerts(state) {
  return {
    type: SET_SHOW_ALERTS,
    state,
  }
}

export function fetchMetadataOptions() {
  return {
    types: array(FETCH_META_OPTIONS),
    call: client => client.get('/dashboard/metadata'),
  };
}

export function getOnboard() {
  return {
    types: ON_BOARD.toArray(),
    call: client => client.get('/boarding'),
  }
}

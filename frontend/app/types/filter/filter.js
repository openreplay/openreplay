import { List, Map } from 'immutable';
import Record from 'Types/Record';
import { KEYS } from 'Types/filter/customFilter';
import { TYPES } from 'Types/filter/event';
import { 
  DATE_RANGE_VALUES,
  CUSTOM_RANGE,
  getDateRangeFromValue
} from 'App/dateRange';
import Event from './event';
// import CustomFilter from './customFilter';
import NewFilter from './newFilter';

const rangeValue = DATE_RANGE_VALUES.LAST_24_HOURS;
const range = getDateRangeFromValue(rangeValue);
const startDate = range.start.unix() * 1000;
const endDate = range.end.unix() * 1000;

export default Record({
  name: '',
  searchId: undefined,
  referrer: undefined,
  userBrowser: undefined,
  userOs: undefined,
  userCountry: undefined,
  userDevice: undefined,
  fid0: undefined,
  events: List(),
  filters: List(),
  minDuration: undefined,
  maxDuration: undefined,
  custom: Map(),
  rangeValue,
  startDate,
  endDate,
  groupByUser: false,

  sort: 'startTs',
  order: 'desc',

  viewed: undefined,
  consoleLogCount: undefined,
  eventsCount: undefined,

  suspicious: undefined,
  consoleLevel: undefined,
  strict: false,
  eventsOrder: 'then',
}, {
  idKey: 'searchId',
  methods: {
    toSaveData() {
      const js = this.toJS();
      js.filters = js.filters.map(filter => {
        filter.type = filter.key
        
        delete filter.category
        delete filter.icon
        delete filter.operatorOptions
        delete filter._key
        delete filter.key
        return filter;
      });

      delete js.createdAt;
      delete js.key;
      delete js._key;
      return js;
    },
    toData() {
      const js = this.toJS();
      js.filters = js.filters.map(filter => {
        // delete filter.operatorOptions
        // delete filter._key
        return filter;
      });

      delete js.createdAt;
      delete js.key;
      return js;
    }
  },
  fromJS({ eventsOrder, filters, events, custom, ...filter }) {
    let startDate;
    let endDate;
    const rValue = filter.rangeValue || rangeValue;
    if (rValue !== CUSTOM_RANGE) {
      const range = getDateRangeFromValue(rValue);
      startDate = range.start.unix() * 1000;
      endDate = range.end.unix() * 1000;
    } else if (filter.startDate && filter.endDate) {
      startDate = filter.startDate;
      endDate = filter.endDate;
    }
    return {
      ...filter,
      eventsOrder,
      startDate,
      endDate,
      events: List(events).map(Event),
      filters: List(filters)
        .map(i => {
          const filter = NewFilter(i).toData();
          if (Array.isArray(i.filters)) {
            filter.filters = i.filters.map(f => NewFilter({...f, subFilter: i.type}).toData());
          }
          return filter;
        }),
    }
  }
});

export const preloadedFilters = [];

export const defaultFilters = [
  {
		category: 'Interactions',
		type: 'default',
		keys: [
      { label: 'Click', key: KEYS.CLICK, type: KEYS.CLICK, filterKey: KEYS.CLICK, icon: 'filters/click', isFilter: false },
      { label: 'DOM Complete', key: KEYS.DOM_COMPLETE, type: KEYS.DOM_COMPLETE, filterKey: KEYS.DOM_COMPLETE, icon: 'filters/click', isFilter: false },
      { label: 'Largest Contentful Paint Time', key: KEYS.LARGEST_CONTENTFUL_PAINT_TIME, type: KEYS.LARGEST_CONTENTFUL_PAINT_TIME, filterKey: KEYS.LARGEST_CONTENTFUL_PAINT_TIME, icon: 'filters/click', isFilter: false },
      { label: 'Time Between Events', key: KEYS.TIME_BETWEEN_EVENTS, type: KEYS.TIME_BETWEEN_EVENTS, filterKey: KEYS.TIME_BETWEEN_EVENTS, icon: 'filters/click', isFilter: false },
      { label: 'Avg CPU Load', key: KEYS.AVG_CPU_LOAD, type: KEYS.AVG_CPU_LOAD, filterKey: KEYS.AVG_CPU_LOAD, icon: 'filters/click', isFilter: false },
      { label: 'Memory Usage', key: KEYS.AVG_MEMORY_USAGE, type: KEYS.AVG_MEMORY_USAGE, filterKey: KEYS.AVG_MEMORY_USAGE, icon: 'filters/click', isFilter: false },
      { label: 'Input', key: KEYS.INPUT, type: KEYS.INPUT, filterKey: KEYS.INPUT, icon: 'event/input', isFilter: false },
      { label: 'Path', key: KEYS.LOCATION, type: KEYS.LOCATION, filterKey: KEYS.LOCATION, icon: 'event/link', isFilter: false },
      // { label: 'View', key: KEYS.VIEW, type: KEYS.VIEW, filterKey: KEYS.VIEW, icon: 'event/view', isFilter: false }
		]
	},
  {
		category: 'Gear',
		type: 'default',
		keys: [
      { label: 'OS', key: KEYS.USER_OS, type: KEYS.USER_OS, filterKey: KEYS.USER_OS, icon: 'os', isFilter: true },
			{ label: 'Browser', key: KEYS.USER_BROWSER, type: KEYS.USER_BROWSER, filterKey: KEYS.USER_BROWSER, icon: 'window', isFilter: true },
      { label: 'Device', key: KEYS.USER_DEVICE, type: KEYS.USER_DEVICE, filterKey: KEYS.USER_DEVICE, icon: 'device', isFilter: true },
      { label: 'Rev ID', key: KEYS.REVID, type: KEYS.REVID, filterKey: KEYS.REVID, icon: 'filters/rev-id', isFilter: true },
      { label: 'Platform', key: KEYS.PLATFORM, type: KEYS.PLATFORM, filterKey: KEYS.PLATFORM, icon: 'filters/platform', isFilter: true },
		]
  },
  {
		category: 'Recording Attributes',
		type: 'default',
		keys: [
      { label: 'Referrer', key: KEYS.REFERRER, type: KEYS.REFERRER, filterKey: KEYS.REFERRER, icon: 'chat-square-quote', isFilter: true },
      { label: 'Duration', key: KEYS.DURATION, type: KEYS.DURATION, filterKey: KEYS.DURATION, icon: 'clock', isFilter: true },
			{ label: 'Country', key: KEYS.USER_COUNTRY, type: KEYS.USER_COUNTRY, filterKey: KEYS.USER_COUNTRY, icon: 'map-marker-alt', isFilter: true },
		]
	},
  {
		category: 'Javascript',
		type: 'default',
		keys: [
      { label: 'Errors', key: KEYS.ERROR, type: KEYS.ERROR, filterKey: KEYS.ERROR, icon: 'exclamation-circle', isFilter: false },
      { label: 'Issues', key: KEYS.ISSUES, type: KEYS.ISSUES, filterKey: KEYS.ISSUES, icon: 'exclamation-circle', isFilter: true },
      { label: 'UTM Source', key: KEYS.UTM_SOURCE, type: KEYS.UTM_SOURCE, filterKey: KEYS.UTM_SOURCE, icon: 'exclamation-circle', isFilter: true },
      { label: 'UTM Medium', key: KEYS.UTM_MEDIUM, type: KEYS.UTM_MEDIUM, filterKey: KEYS.UTM_MEDIUM, icon: 'exclamation-circle', isFilter: true },
      { label: 'UTM Campaign', key: KEYS.UTM_CAMPAIGN, type: KEYS.UTM_CAMPAIGN, filterKey: KEYS.UTM_CAMPAIGN, icon: 'exclamation-circle', isFilter: true },
      
      { label: 'Fetch Requests', key: KEYS.FETCH, type: KEYS.FETCH, filterKey: KEYS.FETCH, icon: 'fetch', isFilter: false },
      { label: 'GraphQL Queries', key: KEYS.GRAPHQL, type: KEYS.GRAPHQL, filterKey: KEYS.GRAPHQL, icon: 'vendors/graphql', isFilter: false },
      { label: 'Store Actions', key: KEYS.STATEACTION, type: KEYS.STATEACTION, filterKey: KEYS.STATEACTION, icon: 'store', isFilter: false },
      { label: 'Custom Events', key: KEYS.CUSTOM, type: KEYS.CUSTOM, filterKey: KEYS.CUSTOM, icon: 'filters/file-code', isFilter: false },
		]
  },
  {
		category: 'User',
		type: 'default',
		keys: [
      { label: 'User ID', key: KEYS.USERID, type: KEYS.USERID, filterKey: KEYS.USERID, icon: 'filters/user-alt', isFilter: true },
      { label: 'Anonymous ID', key: KEYS.USERANONYMOUSID, type: KEYS.USERANONYMOUSID, filterKey: KEYS.USERANONYMOUSID, icon: 'filters/userid', isFilter: true },
		]
	}
];

export const getEventIcon = (filter) => {
  let { type, key, source } = filter;
  type = type || key;
  if (type === KEYS.USER_COUNTRY) return 'map-marker-alt';
  if (type === KEYS.USER_BROWSER) return 'window';
  if (type === KEYS.USERBROWSER) return 'window';
  if (type === KEYS.PLATFORM) return 'window';

  if (type === TYPES.DOM_COMPLETE) return 'filters/click';
  if (type === TYPES.LARGEST_CONTENTFUL_PAINT_TIME) return 'filters/click';
  if (type === TYPES.TIME_BETWEEN_EVENTS) return 'filters/click';
  if (type === TYPES.TTFB) return 'filters/click';
  if (type === TYPES.AVG_CPU_LOAD) return 'filters/click';
  if (type === TYPES.AVG_MEMORY_USAGE) return 'filters/click';

  if (type === TYPES.CLICK) return 'filters/click';
  if (type === TYPES.LOCATION) return 'map-marker-alt';
  if (type === TYPES.VIEW) return 'event/view';
  if (type === TYPES.INPUT) return 'event/input';
  if (type === TYPES.CONSOLE) return 'filters/console';
  if (type === TYPES.METADATA) return 'filters/metadata';
  if (type === TYPES.ERROR) return 'filters/error';
  if (type === TYPES.USERID) return 'filters/userid';
  if (type === TYPES.USERANONYMOUSID) return 'filters/useranonymousid';
  if (type === TYPES.FETCH) return 'fetch';
  if (type === TYPES.GRAPHQL) return 'vendors/graphql';
  if (type === TYPES.STATEACTION) return 'store';
  if (type === TYPES.CUSTOM) {
    if (!source) return 'Custom';
		return 'integrations/' + source;
  }
  return '';
}
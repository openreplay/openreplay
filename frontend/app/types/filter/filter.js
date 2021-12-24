import { List, Map } from 'immutable';
import Record from 'Types/Record';
import { KEYS } from 'Types/filter/customFilter';
import { TYPES } from 'Types/filter/event';
import { 
  DATE_RANGE_VALUES,
  CUSTOM_RANGE,
  dateRangeValues,
  getDateRangeFromValue
} from 'App/dateRange';
import Event from './event';
import CustomFilter from './customFilter';

const rangeValue = DATE_RANGE_VALUES.LAST_7_DAYS;
const range = getDateRangeFromValue(rangeValue);
const startDate = range.start.unix() * 1000;
const endDate = range.end.unix() * 1000;

export default Record({
  name: undefined,
  id: undefined,
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

  sort: 'startTs',
  order: 'desc',

  viewed: undefined,
  consoleLogCount: undefined,
  eventsCount: undefined,

  suspicious: undefined,
  consoleLevel: undefined,
  strict: false,
}, {
  fromJS({ filters, events, custom, ...filter }) {
    let startDate;
    let endDate;
    const rValue = filter.rangeValue || rangeValue;
    if (rValue !== CUSTOM_RANGE) {
      const range = getDateRangeFromValue(rValue);
      startDate = range.start.unix() * 1000;
      endDate = range.end.unix() * 1000;
    }
    return {
      ...filter,
      startDate,
      endDate,
      events: List(events).map(Event),
      filters: List(filters).map(CustomFilter),
      custom: Map(custom),
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
      { label: 'Input', key: KEYS.INPUT, type: KEYS.INPUT, filterKey: KEYS.INPUT, icon: 'event/input', isFilter: false },
      { label: 'Page', key: KEYS.LOCATION, type: KEYS.LOCATION, filterKey: KEYS.LOCATION, icon: 'event/link', isFilter: false },
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
      { label: 'Rev ID', key: KEYS.REVID, type: KEYS.REVID, filterKey: KEYS.REVID, icon: 'filters/border-outer', isFilter: true },
      { label: 'Platform', key: KEYS.PLATFORM, type: KEYS.PLATFORM, filterKey: KEYS.PLATFORM, icon: 'filters/phone-laptop', isFilter: true }
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
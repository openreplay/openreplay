import Record from 'Types/Record';
import { KEYS } from 'Types/filter/customFilter';
import { TYPES } from 'Types/filter/event';
import {
  DATE_RANGE_VALUES,
  CUSTOM_RANGE,
  getDateRangeFromValue,
} from 'App/dateRange';
import NewFilter from './newFilter';

const rangeValue = DATE_RANGE_VALUES.LAST_24_HOURS;
const range = getDateRangeFromValue(rangeValue);
const startDate = range.start.ts;
const endDate = range.end.ts;

export default Record(
  {
    name: '',
    searchId: undefined,
    referrer: undefined,
    userBrowser: undefined,
    userOs: undefined,
    userCountry: undefined,
    userDevice: undefined,
    fid0: undefined,
    filters: [],
    minDuration: undefined,
    maxDuration: undefined,
    custom: {},
    rangeValue,
    startDate,
    endDate,

    sort: 'startTs',
    order: 'desc',

    viewed: undefined,
    consoleLogCount: undefined,

    consoleLevel: undefined,
    eventsOrder: 'then',
  },
  {
    idKey: 'searchId',
    methods: {
      toSaveData() {
        const js = this.toJS();
        js.filters = js.filters.map((filter) => {
          filter.type = filter.key;

          delete filter.category;
          delete filter.icon;
          delete filter.operatorOptions;
          delete filter._key;
          delete filter.key;
          return filter;
        });

        delete js.createdAt;
        delete js.key;
        delete js._key;
        return js;
      },
      toData() {
        const js = this.toJS();
        js.filters = js.filters.map(
          (filter) =>
            // delete filter.operatorOptions
            // delete filter._key
            filter,
        );

        delete js.createdAt;
        delete js.key;
        return js;
      },
    },
    fromJS({ eventsOrder, filters, events, custom, ...filter }) {
      let startDate;
      let endDate;
      const rValue = filter.rangeValue || rangeValue;
      if (rValue !== CUSTOM_RANGE) {
        const range = getDateRangeFromValue(rValue);
        startDate = range.start.ts;
        endDate = range.end.ts;
      } else if (filter.startDate && filter.endDate) {
        startDate = filter.startDate;
        endDate = filter.endDate;
      }
      return {
        ...filter,
        eventsOrder,
        startDate,
        endDate,
        filters: filters.map((i) => {
          const filter = NewFilter(i).toData();
          if (Array.isArray(i.filters)) {
            filter.filters = i.filters.map((f) =>
              NewFilter({ ...f, subFilter: i.type }).toData(),
            );
          }
          return filter;
        }),
      };
    },
  },
);

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
    return `integrations/${source}`;
  }
  return '';
};

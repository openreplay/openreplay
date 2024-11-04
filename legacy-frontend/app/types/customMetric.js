import Record from 'Types/Record';
import { List } from 'immutable';
import Filter from 'Types/filter';
import { validateName } from 'App/validate';
import { LAST_7_DAYS } from 'Types/app/period';
import { FilterKey } from 'Types/filter/filterType';
import { filterMap } from 'Duck/search';

export const FilterSeries = Record({
  seriesId: undefined,
  index: undefined,
  name: 'Filter Series',
  filter: new Filter(),
}, {
  idKey: 'seriesId',
  methods: {
    toData() {
      const js = this.toJS();
      return js;
    },
  },
  fromJS: ({ filter, ...rest }) => ({
    ...rest,
    filter: new Filter(filter),
  }),
});

export default Record({
  metricId: undefined,
  name: 'Series',
  metricType: 'timeseries',
  metricOf: 'sessionCount',
  metricValue: ['sessionCount'],
  metricFormat: 'sessionCount',
  viewType: 'lineChart',
  series: List(),
  isPublic: true,
  startDate: '',
  endDate: '',
  active: true,
  rangeName: LAST_7_DAYS,
}, {
  idKey: 'metricId',
  methods: {
    validate() {
      return validateName(this.name, { empty: false });
    },

    toSaveData() {
      const js = this.toJS();

      js.metricValue = js.metricValue.map(value => value === 'all' ? '' : value);
      
      js.series = js.series.map(series => {
        series.filter.filters = series.filter.filters.map(filterMap);
        // delete series._key
        delete series.key
        return series;
      });

      delete js.key;

      return js;
    },

    toData() {
      const js = this.toJS();
      return js;
    },
  },
  fromJS: ({ metricOf, metricValue, series, ...rest }) => ({
    ...rest,
    series: List(series).map(FilterSeries),
    metricOf,
    metricValue: metricOf === FilterKey.ISSUE && metricValue.length === 0 ? ['all'] : metricValue,
  }),
});

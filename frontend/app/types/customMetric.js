import Record from 'Types/Record';
import { List } from 'immutable';
import Filter from 'Types/filter';
import { validateName } from 'App/validate';

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
  type: 'session_count',
  series: List(),
  isPublic: false,
  startDate: '',
  endDate: '',
  active: true,
}, {
  idKey: 'metricId',
  methods: {
    validate() {
      return validateName(this.name, { empty: false });
    },

    toSaveData() {
      const js = this.toJS();
      
      js.series = js.series.map(series => {
        series.filter.filters = series.filter.filters.map(filter => {
          filter.type = filter.key
          delete filter.operatorOptions
          delete filter.icon
          delete filter.key
          delete filter._key
          return filter;
        });
        delete series._key
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
  fromJS: ({ series, ...rest }) => ({
    ...rest,
    series: List(series).map(FilterSeries),
  }),
});

import Record from 'Types/Record';
import { List } from 'immutable';
// import { DateTime } from 'luxon';
// import { validateEmail, validateName } from 'App/validate';
import Filter from 'Types/filter';
import NewFilter from 'Types/filter';
// import { Event } from 'Types/filter';
// import CustomFilter from 'Types/filter/customFilter';

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
      // js.filter = js.filter.toData();
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
}, {
  idKey: 'metricId',
  methods: {
    validate() {
      return validateName(this.name, { diacritics: true });
    },

    toData() {
      const js = this.toJS();
      js.series = js.series.map(series => {
        series.filter.filters = series.filter.filters.map(filter => {
          delete filter.operatorOptions
          delete filter.icon
          return filter;
        });
        return series;
      });

      return js;
    },
  },
  fromJS: ({ series, ...rest }) => ({
    ...rest,
    series: List(series).map(FilterSeries),
  }),
});

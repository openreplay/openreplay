import Record from 'Types/Record';
import Filter from './filter';
import { List } from 'immutable';

export default Record({
  filterId: undefined,
  projectId: undefined,
  userId: undefined,
  name: undefined,
  filter: Filter(),
  createdAt: undefined,
  count: 0,
  watchdogs: List()
}, {
  idKey: 'filterId',
  methods: {
    toData() {
      const js = this.toJS();
      js.filter.filters = js.filter.filters.map(f => ({...f, value: Array.isArray(f.value) ? f.value : [f.value]}))
      
      return js;
    },
  },
  fromJS({ filter, ...rest }) {
    return {
      ...rest,
      filter: Filter(filter)
    }
  }
});
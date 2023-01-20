import Record from 'Types/Record';
import Filter from './filter';
import { notEmptyString } from 'App/validate';

export default Record({
  searchId: undefined,
  projectId: undefined,
  userId: undefined,
  name: '',
  filter: Filter(),
  createdAt: undefined,
  count: 0,
  isPublic: false,
}, {
  idKey: 'searchId',
  methods: {
    validate() {
      return notEmptyString(this.name);
    },
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
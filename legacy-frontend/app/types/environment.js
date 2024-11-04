import Record from 'Types/Record';
import { validateURL, validateName } from 'App/validate';

export default Record({
  environmentId: undefined,
  url: '',
  name: '',
  default: undefined,
}, {
  idKey: 'environmentId',
  methods: {
    validate() {
      return validateURL(this.url) && validateName(this.name, { empty: false });
    },
  },
});

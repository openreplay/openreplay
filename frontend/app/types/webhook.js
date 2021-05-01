import Record from 'Types/Record';
import { validateName, validateURL } from 'App/validate';

export default Record({
  webhookId: undefined,
  type: undefined,
  name: '',
  endpoint: '',
  authHeader: '',
}, {
  idKey: 'webhookId',
  methods: {
    validate() {
      return !!this.name && validateName(this.name) && !!this.endpoint && validateURL(this.endpoint);
    },
    toData() {
      const js = this.toJS();
      delete js.key;
      return js;
    },
  },
});

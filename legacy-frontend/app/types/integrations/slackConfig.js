import Record from 'Types/Record';
import { validateURL } from 'App/validate';

export default Record({
  // id: undefined,
  endpoint: '',
  name: '',
  webhookId: undefined
}, {
  idKey: 'webhookId',
  methods: {
    validate() {
      return this.endpoint !== '' && this.name != '' && validateURL(this.endpoint);
    },
    exists() {
      return !!this.webhookId;
    },
    toData() {
      const js = this.toJS();
      js.url = this.endpoint;
      
      delete js.key;
      delete js.endpoint;
      return js;
    },
  }
});

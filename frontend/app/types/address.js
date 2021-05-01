import Record from 'Types/Record';

export default Record({
  line1: '',
  postal_code: '',
  city: '',
  state: '',
  country: '',
}, {
  methods: {
    validate() {
      return true;
    },
    toData() {
      const js = this.toJS();
      delete js.key;
      return js;
    },
  },
});

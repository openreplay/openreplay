import Record from 'Types/Record';

export default Record({
  id: undefined,
  maskEmails: false,
  maskNumbers: false,
  defaultInputMode: 'plain',
  sampleRate: 0,
}, {
  idKey: 'id',
  methods: {
    toData() {
      const js = this.toJS();

      delete js.key;
      return js;
    },
  },
});

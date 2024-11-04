import Record from 'Types/Record';

export default Record({
  templateId: undefined,
  name: '',
  code: '',
  framework: 'selenium', // TODO extend
  custom: false,
  tenantId: undefined,
}, {
  idKey: 'templateId',
  methods: {
    validate() {
      return this.code !== '';
    },
  },
});

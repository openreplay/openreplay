import Record from 'Types/Record';

const varRegExp = new RegExp('^[A-Za-z_][A-Za-z0-9_]*$');

export default Record({
  variableId: undefined,
  value: '',
  name: '',
}, {
  idKey: 'variableId',
  methods: {
    validate() {
      return varRegExp.test(this.name) && this.value !== '';
    },
  },
});

import Record from 'Types/Record';
const varRegExp = new RegExp('^[A-Za-z_-][A-Za-z0-9_-]*$');

export const BOOLEAN = 'boolean';
export const STRING = 'string';
export const NUMBER = 'number';
export const MAX_COUNT = 20;

export default Record({
  index: undefined,
  key: '',
  label: '',
  type: STRING,
}, {
  idKey: 'index',
  keyKey: '_key',
  methods: {
    validate() {
      return varRegExp.test(this.key) && this.type !== '';
    },
    toData() {
      const js = this.toJS();

      delete js._key;
      return js;
    },
  },
});


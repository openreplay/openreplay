import Record from 'Types/Record';
import { validateName } from 'App/validate';
import { List } from 'immutable';

export default Record({
  roleId: undefined,
  name: '',
  permissions: List(),
  protected: false,
  description: ''
}, {
  idKey: 'roleId',
  methods: {
    validate() {
      return validateName(this.name, { diacritics: true });
    },
    toData() {
      const js = this.toJS();
      delete js.key;
      delete js.protected;
      return js;
    },
  },
  fromJS({ permissions, ...rest }) {
    return {
      ...rest,
      permissions: List(permissions)
    }
  },
});

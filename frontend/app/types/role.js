import Record from 'Types/Record';
import { notEmptyString, validateName } from 'App/validate';
import { List } from 'immutable';

export default Record({
  roleId: undefined,
  name: '',
  allProjects: true,
  permissions: List(),
  projects: List(),
  protected: false,
  description: '',
  permissionOptions: List(),
}, {
  idKey: 'roleId',
  methods: {
    validate() {
      return notEmptyString(this.name) && validateName(this.name, { diacritics: true }) && (this.allProjects || this.projects.size > 0);
    },
    toData() {
      const js = this.toJS();
      delete js.key;
      delete js.protected;
      return js;
    },
  },
  fromJS({ projects = [], permissions = [], ...rest }) {
    return {
      ...rest,
      permissions: List(permissions),
      projects: List(projects),
    }
  },
});

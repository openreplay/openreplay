import Record from 'Types/Record';
import { DateTime } from 'luxon';
import { validateEmail, validateName } from 'App/validate';

export default Record({
  id: undefined,
  name: '',
  email: '',
  createdAt: undefined,
  admin: false,
  superAdmin: false,
  joined: false,
  expiredInvitation: false,
  roleId: undefined,
  roleName: undefined,
  invitationLink: '',
}, {
  idKey: 'id',
  methods: {
    validate() {
      return validateEmail(this.email) && validateName(this.name, { diacritics: true });
    },

    toData() {
      const js = this.toJS();

      delete js.createdAt;
      return js;
    },
  },
  fromJS: ({ createdAt, ...rest }) => ({
    ...rest,
    createdAt: createdAt && DateTime.fromISO(createdAt || 0),
    id: rest.userId,
  }),
});

import Record from 'Types/Record';
import { DateTime } from 'luxon';
import { validateEmail, validateName } from 'App/validate';

export interface IMember {
  id: string
  name: string
  email: string
  createdAt: DateTime
  admin: boolean
  superAdmin: boolean
  joined: boolean
  expiredInvitation: boolean
  roleId: string
  roleName: string
  invitationLink: string
}

export interface IMemberApiRes {
  userId: string
  name: string
  email: string
  createdAt: string
  admin: boolean
  superAdmin: boolean
  joined: boolean
  expiredInvitation: boolean
  roleId: string
  roleName: string
  invitationLink: string
}

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
  fromJS: ({ createdAt, ...rest }: IMemberApiRes) => ({
    ...rest,
    createdAt: createdAt && DateTime.fromISO(createdAt || '0'),
    id: rest.userId,
  }),
});

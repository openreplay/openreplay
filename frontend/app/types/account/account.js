import Member from 'Types/member';
import Limit from './limit';
import { DateTime } from 'luxon';

export default Member.extend({
  changePassword: undefined,
  limits: Limit(),
  banner: undefined,
  email: '',
  verifiedEmail: undefined,
  id: undefined,
  smtp: false,
  license: '',
  expirationDate: undefined,
  permissions: [],
  iceServers: undefined,
  hasPassword: false, // to check if it's SSO
  apiKey: undefined,
  tenantKey: undefined,
  tenantName: undefined,
  edition: undefined,
}, {
  fromJS: ({ ...account})=> ({
    ...account,
    id: account.id || account.userId,
    expirationDate: account.expirationDate > 0 && DateTime.fromMillis(account.expirationDate || 0),
  })
});
import Member from 'Types/member';
import Appearance from './appearance';
import Limit from './limit';
import { DateTime } from 'luxon';

export default Member.extend({
  changePassword: undefined,
  appearance: Appearance(),
  limits: Limit(),
  banner: undefined,
  email: '',
  verifiedEmail: undefined,
  id: undefined,
  smtp: false,
  license: '',
  expirationDate: undefined,
  permissions: [],
  iceServers: undefined
}, {
  fromJS: ({ current = {}, ...account})=> ({
    ...account,
    license: current.license,
    expirationDate: current.expirationDate > 0 && DateTime.fromMillis(current.expirationDate || 0),
    appearance: Appearance(account.appearance),
  })
});
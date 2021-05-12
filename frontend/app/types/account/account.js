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
  license: '',
  expirationDate: undefined,
}, {
  fromJS: ({ current = {}, ...account})=> ({
    ...account,
    license: current.license,
    expirationDate: current.expirationDate && DateTime.fromMillis(current.expirationDate * 1000 || 0),
    appearance: Appearance(account.appearance),
  })
});
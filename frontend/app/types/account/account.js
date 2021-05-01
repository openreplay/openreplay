import Member from 'Types/member';
import Appearance from './appearance';
import Limit from './limit';

export default Member.extend({
  changePassword: undefined,
  appearance: Appearance(),
  limits: Limit(),
  banner: undefined,
  email: '',
  verifiedEmail: undefined
}, {
  fromJS: account => ({
    ...account,
    appearance: Appearance(account.appearance),
  })
});
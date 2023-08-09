import Member, { IMember } from 'Types/member';
import Limit, { ILimits } from './limit';
import { DateTime } from 'luxon';

// TODO types for mobx and all
export interface IAccount extends IMember {
  changePassword?: any
  limits: ILimits
  banner: string
  email: string
  verifiedEmail: string
  id: string
  smtp: boolean
  license: string
  expirationDate?: DateTime
  permissions: string[]
  settings: any
  iceServers: string
  hasPassword: boolean
  apiKey: string
  tenantKey: string
  edition: string
  optOut: string
}

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
  settings: {},
  iceServers: undefined,
  hasPassword: false, // to check if it's SSO
  apiKey: undefined,
  tenantKey: undefined,
  tenantName: undefined,
  edition: undefined,
  optOut: false,
}, {
  fromJS: ({ ...account})=> ({
    ...account,
    id: account.id || account.userId,
    expirationDate: account.expirationDate > 0 && DateTime.fromMillis(account.expirationDate || 0),
  })
});
import Member, { IMember } from 'Types/member';
import Limit, { ILimits } from './limit';
import { DateTime } from 'luxon';
import { makeAutoObservable } from 'mobx';

export interface IAccount extends IMember {
  changePassword?: any
  limits: ILimits
  banner: string
  email: string
  verifiedEmail: string
  id: string
  smtp: boolean
  license: string
  expirationDate?: number
  permissions: string[]
  settings: any
  iceServers: string
  hasPassword: boolean
  apiKey: string
  tenantKey: string
  edition: string
  optOut: string
  versionNumber: string
}

export default class Account extends Member {
  changePassword: boolean
  limits: Limit[] = []
  banner: boolean
  email: string
  verifiedEmail: boolean
  id: string
  smtp: false
  license: string
  expirationDate: DateTime
  permissions: []
  settings: Record<string, any>
  iceServers: any[]
  hasPassword: boolean
  apiKey: string
  tenantKey: string
  tenantName: string
  edition: string
  optOut: boolean
  versionNumber: string
  tenantId: string

  constructor(account: Partial<IAccount> = {}) {
    super(account);

    Object.assign(this, {
      ...account,
      id: account.id || account.userId,
      expirationDate: DateTime.fromMillis(account.expirationDate ?? 0),
    });

    makeAutoObservable(this);
  }

  toData = () => {
    return {
      ...super.toData(),
      id: this.id,
      email: this.email,
      verifiedEmail: this.verifiedEmail,
      smtp: this.smtp,
      license: this.license,
      expirationDate: this.expirationDate.toMillis(),
      permissions: this.permissions,
      settings: this.settings,
      iceServers: this.iceServers,
      hasPassword: this.hasPassword,
      apiKey: this.apiKey,
      tenantKey: this.tenantKey,
      edition: this.edition,
      optOut: this.optOut,
      versionNumber: this.versionNumber,
    }
  }
}

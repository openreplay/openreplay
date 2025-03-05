import { makeAutoObservable } from 'mobx';
import { DateTime } from 'luxon';
import { validateEmail, validateName } from 'App/validate';

export interface IMember {
  id: string;
  name: string;
  email: string;
  createdAt: DateTime;
  admin: boolean;
  superAdmin: boolean;
  joined: boolean;
  expiredInvitation: boolean;
  roleId: string;
  roleName: string;
  invitationLink: string;
}

export interface IMemberApiRes {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  admin: boolean;
  superAdmin: boolean;
  joined: boolean;
  expiredInvitation: boolean;
  roleId: string;
  roleName: string;
  invitationLink: string;
}

export default class Member {
  id: string;

  name: string;

  email: string;

  createdAt: DateTime;

  admin: boolean;

  superAdmin: boolean;

  joined: boolean;

  expiredInvitation: boolean;

  roleId: string;

  roleName: string;

  invitationLink: string;

  constructor(data: Partial<IMemberApiRes> = {}) {
    Object.assign(this, data);
    makeAutoObservable(this);
  }

  validate = () =>
    validateEmail(this.email) && validateName(this.name, { diacritics: true });

  toData = () => ({
    id: this.id,
    name: this.name,
    email: this.email,
    roleId: this.roleId,
    roleName: this.roleName,
    admin: this.admin,
    superAdmin: this.superAdmin,
    joined: this.joined,
    expiredInvitation: this.expiredInvitation,
    invitationLink: this.invitationLink,
  });
}

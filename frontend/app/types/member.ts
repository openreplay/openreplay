
import { DateTime } from 'luxon';

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

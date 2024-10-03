import { makeAutoObservable } from 'mobx';

import { userService } from 'App/services';

import Role from './types/role';

const permissions = [
  { text: 'Session Replay', value: 'SESSION_REPLAY' },
  { text: 'Developer Tools', value: 'DEV_TOOLS' },
  { text: 'Dashboard', value: 'METRICS' },
  { text: 'Assist (Live)', value: 'ASSIST_LIVE' },
  { text: 'Assist (Call)', value: 'ASSIST_CALL' },
  { text: 'Feature Flags', value: 'FEATURE_FLAGS' },
  { text: 'Spots', value: "SPOT" },
  { text: 'Change Spot Visibility', value: 'SPOT_PUBLIC' }
]

export default class UserStore {
  list: Role[] = [];
  loading: boolean = false;
  permissions = permissions;
  instance = new Role();

  constructor() {
    makeAutoObservable(this);
  }

  toggleLoading = (val: boolean) => {
    this.loading = val;
  }

  setRoles = (roles: Role[]) => {
    this.list = roles;
  }

  init = (role?: any) => {
    if (role) {
      this.instance = new Role().fromJson(role);
    } else {
      this.instance = new Role();
    }
  }

  editRole = (role: Partial<Role>) => {
    Object.assign(this.instance, role)
  }

  saveRole = async (role: Role): Promise<void> => {
    if (role.roleId) {
      return this.modifyRole(role);
    } else {
      return this.createRole(role);
    }
  }

  deleteRole = async (role: Role): Promise<void> => {
    this.toggleLoading(true)
    try {
      const { data } = await userService.deleteRole(role.roleId);
      this.setRoles(data.map((role: any) => new Role().fromJson(role)));
    } catch (e) {
      console.error(e)
    } finally {
      this.toggleLoading(false)
    }
  }

  createRole = async (role: Role): Promise<void> => {
    this.toggleLoading(true)
    try {
      const { data } = await userService.createRole(role);
      this.setRoles([...this.list, new Role().fromJson(data)]);
    } catch (e) {
      console.error(e)
    } finally {
      this.toggleLoading(false)
    }
  }

  modifyRole = async (role: Role): Promise<void> => {
    this.toggleLoading(true)
    try {
      const { data } = await userService.modifyRole(role);
      this.setRoles(this.list.map((r) => r.roleId === data.roleId ? new Role().fromJson(data) : r));
    } catch (e) {
      console.error(e)
    } finally {
      this.toggleLoading(false)
    }
  }

  fetchRoles = (): Promise<any> => {
    this.toggleLoading(true)
    return new Promise((resolve, reject) => {
      userService
        .getRoles()
        .then((response) => {
          this.setRoles(response.map((role: any) => new Role().fromJson(role)))
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          this.toggleLoading(false)
        });
    });
  }
}

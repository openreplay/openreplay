import { makeAutoObservable, runInAction } from 'mobx';

import { notEmptyString, validateName } from 'App/validate';

export default class Role {
  roleId: string = '';

  name: string = '';

  description: string = '';

  permissions: string[] = [];

  createdAt: number = 0;

  isProtected: boolean = false;

  serviceRole: boolean = false;

  allProjects = false;

  projects: string[] = [];

  protected = false;

  constructor() {
    makeAutoObservable(this);
  }

  fromJson(json: any) {
    runInAction(() => {
      Object.assign(this, json);
    });
    return this;
  }

  get validate() {
    return (
      notEmptyString(this.name) &&
      validateName(this.name, { diacritics: true }) &&
      (this.allProjects || this.projects.length > 0)
    );
  }

  exists() {
    return Boolean(this.roleId);
  }

  toJson() {
    return {
      id: this.roleId,
      name: this.name,
      description: this.description,
      permissions: this.permissions,
      allProjects: this.allProjects,
    };
  }
}

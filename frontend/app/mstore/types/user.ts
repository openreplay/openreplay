import { runInAction, makeAutoObservable, observable } from 'mobx'
import { DateTime } from 'luxon';
import { validateEmail } from 'App/validate';

export interface IUser {
    userId: string
    email: string
    createdAt: string
    isAdmin: boolean
    isSuperAdmin: boolean
    isJoined: boolean
    isExpiredInvite: boolean
    roleId: string
    roleName: string
    invitationLink: string

    fromJson(json: any): IUser
    toJson(): any
}

export default class User implements IUser {
    userId: string = '';
    name: string = '';
    email: string = '';
    createdAt: string = '';
    isAdmin: boolean = false;
    isSuperAdmin: boolean = false;
    isJoined: boolean = false;
    isExpiredInvite: boolean = false;
    roleId: string = '';
    roleName: string = '';
    invitationLink: string = '';

    constructor() {
        makeAutoObservable(this, {
            userId: observable,
            email: observable,
            createdAt: observable,
            isAdmin: observable,
            isSuperAdmin: observable,
            isJoined: observable,
            isExpiredInvite: observable,
            roleId: observable,
            roleName: observable,
            invitationLink: observable,
        })
    }

    updateKey(key: string, value: any) {
        console.log(key, value)
        runInAction(() => {
            this[key] = value
        })
    }

    fromJson(json: any) {
        runInAction(() => {
            this.userId = json.id;
            this.name = json.name;
            this.email = json.email;
            this.createdAt = json.createdAt && DateTime.fromISO(json.createdAt || 0)
            this.isAdmin = json.admin
            this.isSuperAdmin = json.superAdmin
            this.isJoined = json.joined
            this.isExpiredInvite = json.expiredInvitation
            this.roleId = json.roleId
            this.roleName = json.roleName
            this.invitationLink = json.invitationLink
        })
        return this;
    }

    toJson() {
        return {
            email: this.email,
            isAdmin: this.isAdmin,
            isSuperAdmin: this.isSuperAdmin,
            roleId: this.roleId,
        }
    }

    valid() {
        return validateEmail(this.email) && !!this.roleId;
    }

    exists() {
        return !!this.userId;
    }
}
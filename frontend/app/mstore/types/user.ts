import { runInAction, makeAutoObservable, observable } from 'mobx'
import { DateTime } from 'luxon';
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

export default class User {
    userId: string = '';
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

    fromJson(json: any) {
        runInAction(() => {
            this.userId = json.id;
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
}
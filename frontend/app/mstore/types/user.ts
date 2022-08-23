import { runInAction, makeAutoObservable, observable } from 'mobx'
import { DateTime } from 'luxon';
import { validateEmail, validateName } from 'App/validate';

export default class User {
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
        runInAction(() => {
            this[key] = value
        })
    }

    fromJson(json: any) {
        runInAction(() => {
            this.userId = json.userId || json.id; // TODO api returning id
            this.name = json.name;
            this.email = json.email;
            this.createdAt = json.createdAt && DateTime.fromMillis(json.createdAt || 0)
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
            userId: this.userId,
            name: this.name,
            email: this.email,
            admin: this.isAdmin,
            superAdmin: this.isSuperAdmin,
            roleId: this.roleId,
            joined: this.isJoined,
            invitationLink: this.invitationLink,
            expiredInvitation: this.isExpiredInvite,
        }
    }

    toSave() {
        return {
            name: this.name,
            email: this.email,
            admin: this.isAdmin,
            roleId: this.roleId,
        }
    }

    valid(isEnterprise: boolean = false) {
        return validateName(this.name, { empty: false }) && validateEmail(this.email) && (isEnterprise ? !!this.roleId : true);
    }

    exists() {
        return !!this.userId;
    }
}

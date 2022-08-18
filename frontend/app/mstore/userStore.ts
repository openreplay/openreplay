import { makeAutoObservable, observable, action } from "mobx"
import User, { IUser } from "./types/user";
import { userService } from "App/services";
import { toast } from 'react-toastify';
import copy from 'copy-to-clipboard';

export default class UserStore {
    list: IUser[] = [];
    instance: IUser|null = null;
    page: number = 1;
    pageSize: number = 10;
    searchQuery: string = "";
    modifiedCount: number = 0;

    loading: boolean = false;
    saving: boolean = false;
    limits: any = {};
    initialDataFetched: boolean = false;

    constructor() {
        makeAutoObservable(this, {
            instance: observable,
            updateUser: action,
            updateKey: action,
            initUser: action,
            setLimits: action,
        })
    }

    fetchLimits(): Promise<any> {
        return new Promise((resolve, reject) => {
            userService.getLimits()
                .then((response: any) => {
                    this.setLimits(response);
                    resolve(response);
                }).catch((error: any) => {
                    reject(error);
                });
        });
    }

    setLimits(limits: any) {
        this.limits = limits;
    }

    initUser(user?: any ): Promise<void> {
        return new Promise((resolve, reject) => {
            if (user) {
                this.instance = new User().fromJson(user.toJson());
            } else {
                this.instance = new User();
            }
            resolve();
        })
    }

    updateKey(key: string, value: any) {
        this[key] = value

        if (key === 'searchQuery') {
            this.page = 1
        }
    }

    updateUser(user: IUser) {
        const index = this.list.findIndex(u => u.userId === user.userId);
        if (index > -1) {
            this.list[index] = user;
        }
    }

    fetchUser(userId: string): Promise<any> {
        this.loading = true;
        return new Promise((resolve, reject) => {
            userService.one(userId)
                .then(response => {
                    this.instance = new User().fromJson(response.data);
                    resolve(response);
                }).catch(error => {
                    this.loading = false;
                    reject(error);
                }).finally(() => {
                    this.loading = false;
                });
        });
    }

    fetchUsers(): Promise<any> {
        this.loading = true;
        return new Promise((resolve, reject) => {
            userService.all()
                .then(response => {
                    this.list = response.map(user => new User().fromJson(user));
                    resolve(response);
                }).catch(error => {
                    this.loading = false;
                    reject(error);
                }).finally(() => {
                    this.loading = false;
                });
        });
    }

    saveUser(user: IUser): Promise<any> {
        this.saving = true;
        const wasCreating = !user.userId;
        return new Promise((resolve, reject) => {
            userService.save(user).then(response => {
                    const newUser = new User().fromJson(response);
                    if (wasCreating) {
                        this.modifiedCount -= 1;
                        this.list.push(new User().fromJson(newUser));
                        toast.success('User created successfully');
                    } else {
                        this.updateUser(newUser);
                        toast.success('User updated successfully');
                    }
                    resolve(response);
                }).catch(error => {
                    this.saving = false;
                    toast.error('Error saving user');
                    reject(error);
                }).finally(() => {
                    this.saving = false;
                });
        });
    }

    deleteUser(userId: string): Promise<any> {
        this.saving = true;
        return new Promise((resolve, reject) => {
            userService.delete(userId)
                .then(response => {
                    this.modifiedCount += 1;
                    this.list = this.list.filter(user => user.userId !== userId);
                    resolve(response);
                }).catch(error => {
                    this.saving = false;
                    toast.error('Error deleting user');
                    reject(error);
                }).finally(() => {
                    this.saving = false;
                });
        });
    }

    copyInviteCode(userId: string): void {
        const content = this.list.find(u => u.userId === userId)?.invitationLink;
        if (content) {
            copy(content);
            toast.success('Invite code copied successfully');
        } else {
            toast.error('Invite code not found');
        }
    }

    generateInviteCode(userId: string): Promise<any> {
        this.saving = true;
        const promise = new Promise((resolve, reject) => {
            userService.generateInviteCode(userId)
                .then(response => {
                    const index = this.list.findIndex(u => u.userId === userId);
                    if (index > -1) {
                        this.list[index].updateKey('isExpiredInvite', false);
                        this.list[index].updateKey('invitationLink', response.invitationLink);
                    }
                    resolve(response);
                }).catch(error => {
                    this.saving = false;
                    reject(error);
                }).finally(() => {
                    this.saving = false;
                });
        });

        toast.promise(promise, {
            pending: 'Generating an invite code...',
            success: 'Invite code generated successfully',
        })

        return promise;
    }
}

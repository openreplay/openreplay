import { makeAutoObservable, observable, action } from "mobx"
import User, { IUser } from "./types/user";
import { userService } from "App/services";
import { toast } from 'react-toastify';

export default class UserStore {
    list: IUser[] = [];
    instance: IUser|null = null;
    page: number = 1;
    pageSize: number = 10;
    searchQuery: string = "";

    loading: boolean = false;
    saving: boolean = false;

    constructor() {
        makeAutoObservable(this, {
            instance: observable,
            updateUser: action,
            updateKey: action,
            initUser: action,
        })
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
                        this.list.push(new User().fromJson(newUser));
                        toast.success('User created successfully');
                    } else {
                        this.updateUser(newUser);
                        toast.success('User updated successfully');
                    }
                    resolve(response);
                }).catch(error => {
                    this.saving = false;
                    reject(error);
                }).finally(() => {
                    this.saving = false;
                });
        });
    }

    deleteUser(userId: string): Promise<any> {
        this.loading = true;
        return new Promise((resolve, reject) => {
            userService.delete(userId)
                .then(response => {
                    this.instance = null;
                    resolve(response);
                }).catch(error => {
                    this.loading = false;
                    reject(error);
                }).finally(() => {
                    this.loading = false;
                });
        });
    }
}
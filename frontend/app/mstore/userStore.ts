import { makeAutoObservable, observable, action } from "mobx"
import User, { IUser } from "./types/user";
import { userService } from "App/services";

export default class UserStore {
    list: IUser[] = [];
    instance: IUser|null = null;
    loading: boolean = false;
    page: number = 1;
    pageSize: number = 10;
    searchQuery: string = "";

    constructor() {
        makeAutoObservable(this, {
            instance: observable,
            updateUser: action,
            updateKey: action,
        })
    }

    updateKey(key: string, value: any) {
        this[key] = value

        if (key === 'searchQuery') {
            this.page = 1
        }
    }

    updateUser(user: any) {
        Object.assign(this.instance, user);
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
        this.loading = true;
        const wasCreating = !user.userId;
        return new Promise((resolve, reject) => {
            userService.save(user)
                .then(response => {
                    if (wasCreating) {
                        this.list.push(new User().fromJson(response.data));
                    } else {
                        this.updateUser(response.data);
                    }
                    resolve(response);
                }).catch(error => {
                    this.loading = false;
                    reject(error);
                }).finally(() => {
                    this.loading = false;
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
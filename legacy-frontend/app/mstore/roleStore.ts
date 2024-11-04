import { makeAutoObservable, observable } from "mobx"
import { userService } from "App/services";
import Role, { IRole } from "./types/role";

export default class UserStore {
    list: IRole[] = [];
    loading: boolean = false;

    constructor() {
        makeAutoObservable(this, {
            list: observable,
            loading: observable,
        })
    }

    fetchRoles(): Promise<any> {
        this.loading = true;
        return new Promise((resolve, reject) => {
            userService.getRoles()
                .then(response => {
                    this.list = response.map((role: any) => new Role().fromJson(role));
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
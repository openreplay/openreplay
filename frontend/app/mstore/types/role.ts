import { makeAutoObservable, observable, runInAction } from "mobx";

export interface IRole {
    roleId: string;
    name: string;
    description: string;
    isProtected: boolean;

    fromJson(json: any);
    toJson(): any;
}

export default class Role implements IRole {
    roleId: string = '';
    name: string = '';
    description: string = '';   
    isProtected: boolean = false;


    constructor() {
        makeAutoObservable(this, {
            roleId: observable,
            name: observable,
            description: observable,
        })
    }

    fromJson(json: any) {
        runInAction(() => {
            this.roleId = json.roleId;
            this.name = json.name;
            this.description = json.description;
            this.isProtected = json.protected;
        })
        return this;
    }

    toJson() {
        return {
            id: this.roleId,
            name: this.name,
            description: this.description,
        }
    }
}
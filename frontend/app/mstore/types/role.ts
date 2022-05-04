import { makeAutoObservable, observable, runInAction } from "mobx";

export interface IRole {
    roleId: string;
    name: string;
    description: string;

    fromJson(json: any): IRole;
    toJson(): any;
}

export default class Role implements IRole {
    roleId: string = '';
    name: string = '';
    description: string = '';   


    constructor() {
        makeAutoObservable(this, {
            roleId: observable,
            name: observable,
            description: observable,
        })
    }

    fromJson(json: any) {
        runInAction(() => {
            this.roleId = json.id;
            this.name = json.name;
            this.description = json.description;
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
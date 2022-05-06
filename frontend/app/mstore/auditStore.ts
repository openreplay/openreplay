import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import { auditService } from "App/services"
import Audit from './types/audit'

export default class AuditStore {
    list: any[] = [];
    total: number = 0;
    page: number = 1;
    pageSize: number = 20;
    searchQuery: string = '';
    isLoading: boolean = false;

    constructor() {
        makeAutoObservable(this, {
            searchQuery: observable,
            updateKey: action,
            fetchAudits: action,
        })
    }

    updateKey(key: string, value: any) {
        console.log(key, value)
        this[key] = value;
    }

    fetchAudits = (data: any): Promise<void> => {
        this.isLoading = true;
        return new Promise((resolve, reject) => {
            auditService.all(data).then(response => {
                console.log('response', response);
                runInAction(() => {
                    this.list = response.sessions.map(item => Audit.fromJson(item))
                    this.total = response.count
                })
                resolve()
            }).catch(error => {
                reject(error)
            }).finally(() => {
                this.isLoading = false;
            })
        })
    }
}
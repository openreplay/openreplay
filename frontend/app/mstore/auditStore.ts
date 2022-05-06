import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import { auditService } from "App/services"
import Audit from './types/audit'
import Period, { LAST_7_DAYS } from 'Types/app/period';

export default class AuditStore {
    list: any[] = [];
    total: number = 0;
    page: number = 1;
    pageSize: number = 20;
    searchQuery: string = '';
    isLoading: boolean = false;
    order: string = 'desc';
    period: Period = Period({ rangeName: LAST_7_DAYS })

    constructor() {
        makeAutoObservable(this, {
            searchQuery: observable,
            updateKey: action,
            fetchAudits: action,
        })
    }

    setDateRange(data: any) {
        this.period = new Period(data);
    }

    updateKey(key: string, value: any) {
        this[key] = value;
    }

    fetchAudits = (data: any): Promise<void> => {
        this.isLoading = true;
        return new Promise((resolve, reject) => {
            auditService.all(data).then(response => {
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
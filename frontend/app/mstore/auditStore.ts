import { makeAutoObservable, runInAction, observable, action } from "mobx"
import { auditService } from "App/services"
import Audit from './types/audit'
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { toast } from 'react-toastify';
import { exportCSVFile } from 'App/utils';
import { DateTime } from 'luxon'; // TODO

export default class AuditStore {
    list: any[] = [];
    total: number = 0;
    page: number = 1;
    pageSize: number = 20;
    searchQuery: string = '';
    isLoading: boolean = false;
    order: string = 'desc';
    period: Period|null = Period({ rangeName: LAST_7_DAYS })

    constructor() {
        makeAutoObservable(this, {
            searchQuery: observable,
            period: observable,
            updateKey: action,
            fetchAudits: action,
            setDateRange: action,
        })
    }

    setDateRange(data: any) {
        this['period'] = data;
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

    fetchAllAudits = async (data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            auditService.all(data).then((data) => {
                const headers = [
                    { label: 'User', key: 'username' },
                    { label: 'Email', key: 'email' },
                    { label: 'UserID', key: 'userId' },
                    { label: 'Method', key: 'method' },
                    { label: 'Action', key: 'action' },
                    { label: 'Endpoint', key: 'endpoint' },
                    { label: 'Created At', key: 'createdAt' },
                ]
                data = data.sessions.map(item => ({
                    ...item,
                    createdAt: DateTime.fromMillis(item.createdAt).toFormat('LLL dd yyyy hh:mm a')
                }))
                exportCSVFile(headers, data, `audit-${new Date().toLocaleDateString()}`);
                resolve(data)
            }).catch(error => {
                reject(error)
            })
        })
    }

    exportToCsv = async (): Promise<void> => {
        const promise = this.fetchAllAudits({ limit: this.total })
        toast.promise(promise, {
            pending: 'Exporting...',
            success: 'Export successful',
        })
    }
}
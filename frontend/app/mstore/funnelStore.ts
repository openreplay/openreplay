import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import { funnelService } from "App/services"
import Funnel, { IFunnel } from "./types/funnel";
import Period, { LAST_7_DAYS } from 'Types/app/period';

export default class FunnelStore {
    isLoading: boolean = false
    isSaving: boolean = false
    list: IFunnel[] = []
    instance: IFunnel | null = null
    period: Period = Period({ rangeName: LAST_7_DAYS })

    page: number = 1
    pageSize: number = 10
    
    constructor() {
        makeAutoObservable(this, {
            updateKey: action,
            fetchFunnels: action,
            fetchFunnel: action,
            saveFunnel: action,
            deleteFunnel: action
        })
    }

    updateKey(key: string, value: any) {
        this[key] = value
    }

    fetchFunnels(): Promise<any> {
        this.isLoading = true
        return new Promise((resolve, reject) => {
            funnelService.all()
                .then(response => {
                    this.list = response
                    resolve(response)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isLoading = false
                }
            )
        })
    }

    fetchFunnel(funnelId: string): Promise<any> {
        this.isLoading = true
        return new Promise((resolve, reject) => {
            funnelService.one(funnelId)
                .then(response => {
                    const _funnel = new Funnel().fromJSON(response)
                    this.instance = _funnel
                    resolve(_funnel)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isLoading = false
                }
            )
        })
    }

    saveFunnel(funnel: IFunnel): Promise<any> {
        this.isSaving = true
        const wasCreating = !funnel.funnelId
        return new Promise((resolve, reject) => {
            funnelService.save(funnel)
                .then(response => {
                    const _funnel = new Funnel().fromJSON(response)
                    if (wasCreating) {
                        this.list.push(_funnel)
                    }
                    resolve(_funnel)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isSaving = false
                }
            )
        })
    }

    deleteFunnel(funnelId: string): Promise<any> {
        this.isSaving = true
        return new Promise((resolve, reject) => {
            funnelService.delete(funnelId)
                .then(response => {
                    this.list = this.list.filter(funnel => funnel.funnelId !== funnelId)
                    resolve(funnelId)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isSaving = false
                }
            )
        })
    }
}
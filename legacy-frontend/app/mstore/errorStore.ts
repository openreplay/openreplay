import { makeAutoObservable } from "mobx"
import { errorService } from "App/services"
import Error from "./types/error"

export default class ErrorStore {
    isLoading: boolean = false
    isSaving: boolean = false

    errors: any[] = []
    instance: Error | null = null

    constructor() {
        makeAutoObservable(this, {
            
        })
    }

    updateKey(key: string, value: any) {
        this[key] = value
    }

    fetchErrors(): Promise<any> {
        this.isLoading = true
        return new Promise((resolve, reject) => {
            errorService.all()
                .then(response => {
                    const errors = response.map(e => new Error().fromJSON(e));
                    this.errors = errors
                    resolve(errors)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isLoading = false
                }
            )
        })
    }

    fetchError(errorId: string): Promise<any> {
        this.isLoading = true
        return new Promise((resolve, reject) => {
            errorService.one(errorId)
                .then(response => {
                    const error = new Error().fromJSON(response);
                    this.instance = error
                    resolve(error)
                }).catch(error => {
                    reject(error)
                }).finally(() => {
                    this.isLoading = false
                }
            )
        })
    }
}
import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"

export default class Widget {
    widgetId: any = undefined
    name: string = ""
    type: string = ""
    position: number = 0
    data: any = {}
    isLoading: boolean = false
    isValid: boolean = false
    dashboardId: any = undefined
    colSpan: number = 2
    
    constructor() {
        makeAutoObservable(this, {
            widgetId: observable,
            name: observable,
            type: observable,
            position: observable,
            data: observable,
            isLoading: observable,
            isValid: observable,
            dashboardId: observable,
            colSpan: observable,

            fromJson: action,
            toJson: action,
            validate: action,
            update: action,
        })
    }

    fromJson(json: any) {
        runInAction(() => {
            this.widgetId = json.widgetId
            this.name = json.name
            this.type = json.type
            this.data = json.data
        })
        return this
    }

    toJson() {
        return {
            widgetId: this.widgetId,
            name: this.name,
            type: this.type,
            data: this.data
        }
    }

    validate() {
        this.isValid = this.name.length > 0
    }

    update(data: any) {
        runInAction(() => {
            Object.assign(this, data)
        })
    }
}
import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"

export default class SessionSettings {
    skipToIssue: boolean = false
    timezone: string = "EST"
    durationFilter: any = {
        count: 0,
        countType: 'min',
        operator: '>'
    }
    captureRate: number = 0
    captureAll: boolean = false

    constructor() {
        makeAutoObservable(this, {
            updateKey: action
        })
    }

    updateKey(key: string, value: any) {
        console.log(`SessionSettings.updateKey(${key}, ${value})`)
        runInAction(() => {
            this[key] = value
        })
    }
}

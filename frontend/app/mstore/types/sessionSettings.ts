import { makeAutoObservable, runInAction, observable, action, reaction } from "mobx"
import { SKIP_TO_ISSUE, TIMEZONE, DURATION_FILTER  } from 'App/constants/storageKeys'

export default class SessionSettings {
    skipToIssue: boolean = localStorage.getItem(SKIP_TO_ISSUE) === 'true';
    timezone: string = localStorage.getItem(TIMEZONE) || 'UTC';
    durationFilter: any = JSON.parse(localStorage.getItem(DURATION_FILTER) || '{}');
    captureRate: number = 0
    captureAll: boolean = false

    constructor() {
        makeAutoObservable(this, {
            updateKey: action
        })
    }

    merge(settings: any) {
        for (const key in settings) {
            if (settings.hasOwnProperty(key)) {
                this.updateKey(key, settings[key]);
            }
        }
    }
    
    updateKey(key: string, value: any) {
        runInAction(() => {
            this[key] = value
        })

        if (key === 'captureRate' || key === 'captureAll') return

        if (key === 'durationFilter') {
            localStorage.setItem(`__$session-${key}$__`, JSON.stringify(value));
        } else {
            localStorage.setItem(`__$session-${key}$__`, value);
        }
    }
}

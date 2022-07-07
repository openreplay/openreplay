import { makeAutoObservable, runInAction, action } from "mobx"
import { SKIP_TO_ISSUE, TIMEZONE, DURATION_FILTER  } from 'App/constants/storageKeys'

export type Timezone = {
    label: string,
    value: string,
  }

export default class SessionSettings {
    skipToIssue: boolean = localStorage.getItem(SKIP_TO_ISSUE) === 'true';
    timezone: Timezone;
    durationFilter: any = JSON.parse(localStorage.getItem(DURATION_FILTER) || '{}');
    captureRate: string = '0'
    captureAll: boolean = false

    constructor() {
        // compatibility fix for old timezone storage
        // TODO: remove after a while (1.7.1?)
        this.timezoneFix()
        this.timezone = JSON.parse(localStorage.getItem(TIMEZONE)) || { label: 'UTC / GMT +00:00', value: 'UTC' } 
        makeAutoObservable(this)
    }

    merge = (settings: any) => {
        for (const key in settings) {
            if (settings.hasOwnProperty(key)) {
                this.updateKey(key, settings[key]);
            }
        }
    }

    changeCaptureRate = (rate: string) => {
        if (!rate) return this.captureRate = '0';
        // react do no see the difference between 01 and 1 decimals, this is why we have to use string casting
        if (parseInt(rate, 10) <= 100) this.captureRate = `${parseInt(rate, 10)}`;
    }

    changeCaptureAll = (all: boolean) => {
        this.captureAll = all;
    }

    timezoneFix() {
        if (localStorage.getItem(TIMEZONE) === '[object Object]') {
            localStorage.setItem(TIMEZONE, JSON.stringify({ label: 'UTC / GMT +00:00', value: 'UTC' }));
        }
    }
    
    updateKey = (key: string, value: any) => {
        runInAction(() => {
            this[key] = value
        })

        if (key === 'captureRate' || key === 'captureAll') return

        if (key === 'durationFilter' || key === 'timezone') {
            localStorage.setItem(`__$session-${key}$__`, JSON.stringify(value));
        } else {
            localStorage.setItem(`__$session-${key}$__`, value);
        }
    }
}

import { makeAutoObservable, runInAction, action } from 'mobx';
import moment from 'moment';
import { SKIP_TO_ISSUE, TIMEZONE, DURATION_FILTER } from 'App/constants/storageKeys';

export type Timezone = {
    label: string;
    value: string;
};

const defaultDurationFilter = {
    operator: '<',
    count: '0',
    countType: 'sec'
}

export const generateGMTZones = (): Timezone[] => {
    const timezones: Timezone[] = [];

    const positiveNumbers = [...Array(12).keys()];
    const negativeNumbers = [...Array(12).keys()].reverse();
    negativeNumbers.pop(); // remove trailing zero since we have one in positive numbers array

    const combinedArray = [...negativeNumbers, ...positiveNumbers];

    for (let i = 0; i < combinedArray.length; i++) {
        let symbol = i < 11 ? '-' : '+';
        let isUTC = i === 11;
        let value = String(combinedArray[i]).padStart(2, '0');

        let tz = `UTC ${symbol}${String(combinedArray[i]).padStart(2, '0')}:00`;

        let dropdownValue = `UTC${symbol}${value}`;
        timezones.push({ label: tz, value: isUTC ? 'UTC' : dropdownValue });
    }

    timezones.splice(17, 0, { label: 'GMT +05:30', value: 'UTC+05:30' });
    return timezones;
};

export default class SessionSettings {
    defaultTimezones = [...generateGMTZones()]
    skipToIssue: boolean = localStorage.getItem(SKIP_TO_ISSUE) === 'true';
    timezone: Timezone;
    durationFilter: any = JSON.parse(localStorage.getItem(DURATION_FILTER) || JSON.stringify(defaultDurationFilter));
    captureRate: string = '0';
    captureAll: boolean = false;

    constructor() {
        // compatibility fix for old timezone storage
        // TODO: remove after a while (1.7.1?)
        const userTimezoneOffset = moment().format('Z');
        const defaultTimezone = this.defaultTimezones.find(tz => tz.value.includes('UTC' + userTimezoneOffset.slice(0,3))) || { label: 'Local', value: `UTC${userTimezoneOffset}` };

        this.timezoneFix(defaultTimezone);
        this.timezone = JSON.parse(localStorage.getItem(TIMEZONE)) || defaultTimezone;
        makeAutoObservable(this);
    }

    merge = (settings: any) => {
        for (const key in settings) {
            if (settings.hasOwnProperty(key)) {
                this.updateKey(key, settings[key]);
            }
        }
    };

    changeCaptureRate = (rate: string) => {
        if (!rate) return (this.captureRate = '0');
        // react do no see the difference between 01 and 1 decimals, this is why we have to use string casting
        if (parseInt(rate, 10) <= 100) this.captureRate = `${parseInt(rate, 10)}`;
    };

    changeCaptureAll = (all: boolean) => {
        this.captureAll = all;
    };

    timezoneFix(defaultTimezone: Record<string, string>) {
        if (localStorage.getItem(TIMEZONE) === '[object Object]' || !localStorage.getItem(TIMEZONE)) {
            localStorage.setItem(TIMEZONE, JSON.stringify(defaultTimezone));
        }
    }

    updateKey = (key: string, value: any) => {
        runInAction(() => {
            this[key] = value;
        });

        if (key === 'captureRate' || key === 'captureAll') return;

        if (key === 'durationFilter' || key === 'timezone') {
            localStorage.setItem(`__$session-${key}$__`, JSON.stringify(value));
        } else {
            localStorage.setItem(`__$session-${key}$__`, value);
        }
    };
}

import { makeAutoObservable, runInAction } from 'mobx';
import {
  SKIP_TO_ISSUE,
  TIMEZONE,
  TIMEZONE_LOCAL,
  SHOWN_TIMEZONE,
  DURATION_FILTER,
  MOUSE_TRAIL,
  VIRTUAL_MODE_KEY,
} from 'App/constants/storageKeys';
import { DateTime, Settings } from 'luxon';

export type Timezone = {
  label: string;
  value: string;
};

const defaultDurationFilter = {
  operator: '<',
  count: '0',
  countType: 'sec',
};

const negativeExceptions = {
  4: ['-04:30'],
  3: ['-03:30'],
};
const exceptions = {
  3: ['+03:30'],
  4: ['+04:30'],
  5: ['+05:30', '+05:45'],
  6: ['+06:30'],
  9: ['+09:30'],
};

export const generateGMTZones = (): Timezone[] => {
  const timezones: Timezone[] = [];

  const positiveNumbers = [...Array(13).keys()];
  const negativeNumbers = [...Array(13).keys()].reverse();
  negativeNumbers.pop(); // remove trailing zero since we have one in positive numbers array

  const combinedArray = [...negativeNumbers, ...positiveNumbers];

  for (let i = 0; i < combinedArray.length; i++) {
    const symbol = i < 12 ? '-' : '+';
    const isUTC = i === 12;
    const item = combinedArray[i];
    const value = String(item).padStart(2, '0');

    const tz = `UTC ${symbol}${String(item).padStart(2, '0')}:00`;

    const dropdownValue = `UTC${symbol}${value}`;
    timezones.push({ label: tz, value: isUTC ? 'UTC' : dropdownValue });

    // @ts-ignore
    const negativeMatch = negativeExceptions[item];
    const positiveMatch = exceptions[item];
    if (i < 11 && negativeMatch) {
      negativeMatch.forEach((str: string) => {
        timezones.push({ label: `UTC ${str}`, value: `UTC${str}` });
      });
    } else if (i > 11 && positiveMatch) {
      positiveMatch.forEach((str: string) => {
        timezones.push({ label: `UTC ${str}`, value: `UTC${str}` });
      });
    }
  }

  return timezones;
};

export default class SessionSettings {
  defaultTimezones = [...generateGMTZones()];
  skipToIssue: boolean = localStorage.getItem(SKIP_TO_ISSUE) === 'true';
  timezone: Timezone;
  durationFilter: any = JSON.parse(
    localStorage.getItem(DURATION_FILTER) ||
      JSON.stringify(defaultDurationFilter),
  );
  captureRate: string = '0';
  conditionalCapture: boolean = false;
  captureConditions: { name: string; captureRate: number; filters: any[] }[] =
    [];
  mouseTrail: boolean = localStorage.getItem(MOUSE_TRAIL) !== 'false';
  shownTimezone: 'user' | 'local';
  virtualMode: boolean = localStorage.getItem(VIRTUAL_MODE_KEY) === 'true';
  usingLocal: boolean = false;

  constructor() {
    const userTimezoneOffset = DateTime.local().toFormat('ZZ');
    const defaultTimezone = this.defaultTimezones.find(
      (tz) => tz.value === `UTC${userTimezoneOffset.slice(0, 3)}`,
    ) || { label: 'Local', value: `UTC${userTimezoneOffset}` };

    const savedTz = localStorage.getItem(TIMEZONE);
    let isLocal = localStorage.getItem(TIMEZONE_LOCAL) === 'true';
    if (!savedTz) {
      localStorage.setItem(TIMEZONE, JSON.stringify(defaultTimezone));
      localStorage.setItem(TIMEZONE_LOCAL, 'true');
      isLocal = true;
    }
    if (isLocal) {
      this.timezone = defaultTimezone;
      this.usingLocal = true;
    } else {
      this.timezone = savedTz ? JSON.parse(savedTz) : defaultTimezone;
    }
    Settings.defaultZone = this.timezone.value;
    if (localStorage.getItem(MOUSE_TRAIL) === null) {
      localStorage.setItem(MOUSE_TRAIL, 'true');
    }

    this.shownTimezone =
      localStorage.getItem(SHOWN_TIMEZONE) === 'user' ? 'user' : 'local';
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

  changeConditionalCapture = (all: boolean) => {
    this.conditionalCapture = all;
  };

  updateTimezone = (value: Timezone, local?: boolean) => {
    this.timezone = value;
    Settings.defaultZone = value.value;
    localStorage.setItem(TIMEZONE, JSON.stringify(value));
    localStorage.setItem(TIMEZONE_LOCAL, local ? 'true' : 'false');
    this.usingLocal = local || false;
  };

  updateKey = (key: string, value: any) => {
    runInAction(() => {
      // @ts-ignore
      this[key] = value;
    });

    if (key === 'captureRate' || key === 'captureAll') return;
    if (key === 'shownTimezone') {
      return localStorage.setItem(SHOWN_TIMEZONE, value as string);
    }
    if (key === 'durationFilter' || key === 'timezone') {
      localStorage.setItem(`__$session-${key}$__`, JSON.stringify(value));
    } else {
      localStorage.setItem(`__$session-${key}$__`, value);
    }
  };
}

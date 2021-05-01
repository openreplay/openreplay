import { Record, List, Map } from 'immutable';
import { DateTime } from 'luxon';
import {
  CHANNEL,
  DAYS,
  HOURS,
  EMAIL,
  SLACK,
  WEBHOOK
} from 'App/constants/schedule';
// import runFromJS from './run';
import { validateEmail } from 'App/validate';

export const DEFAULT_ENV_VALUE = '_';
const Schedule = Record({
  minutes: 30,
  hour: 0,
  day: -2,
  testId: '',
  sourceCode: '',
  name: '',  
  nextExecutionTime: undefined,
  numberOFExecutions: undefined,
  schedulerId: undefined,
  environmentId: DEFAULT_ENV_VALUE,
  device: 'desktop',
  locations: [],
  
  advancedOptions: false,
  headers: [{}],
  cookies: [{}],
  basicAuth: {},
  network: 'wifi',
  bypassCSP: false,

  slack: false,
  slackInput: [],
  webhook: false,
  webhookInput: [],
  email: false,
  emailInput: [],
  hasNotification: false,
  options: Map({ message: [], device: 'desktop' }),

  extraCaps: {},

  validateEvery() {
    if (this.day > -2) return true;
    return this.minutes >= 5 && this.minutes <= 1440;
  },
  validateWebhookEmail() {
    if (this.channel !== EMAIL) return true;
    return validateEmail(this.webhookEmail);
  },
  validateWebhook() {
    if (this.channel !== WEBHOOK) return true;
    return this.webhookId !== '';
  }
});

function fromJS(schedule = {}) {
  if (schedule instanceof Schedule) return schedule;
  const options = schedule.options || { message: [] };
  const extraCaps = options.extraCaps || { };

  let channel = '';
  if (schedule.webhookEmail) {
    channel = EMAIL;
  } else if (schedule.webhookId && schedule.webhook) {
    channel = schedule.webhook.type === 'slack' ? SLACK : WEBHOOK;
  }

  const nextExecutionTime = schedule.nextExecutionTime ?
    DateTime.fromMillis(schedule.nextExecutionTime) : undefined;


  let { day, minutes } = schedule;
  let hour;
  if (day !== -2) {
    const utcOffset = new Date().getTimezoneOffset();
    minutes = minutes - utcOffset
    minutes = minutes >= 1440 ? (minutes - 1440) : minutes;
    hour = Math.floor(minutes / 60);    
  }
  // if (day !== -2) {
  //   const utcOffset = new Date().getTimezoneOffset();
  //   const hourOffset = Math.floor(utcOffset / 60);
  //   const minuteOffset = utcOffset - 60*hourOffset;

  //   minutes -= minuteOffset;
  //   hour -= hourOffset;
  //   if (day !== -1) {
  //     const dayOffset = Math.floor(hour/24); // +/-1
  //     day = (day + dayOffset + 7) % 7;
  //   }
  //   hour = (hour + 24) % 24;
  // }

  const slack = List(options.message).filter(i => i.type === 'slack');
  const email = List(options.message).filter(i => i.type === 'email');
  const webhook = List(options.message).filter(i => i.type === 'webhook');

  const headers = extraCaps.headers ? Object.keys(extraCaps.headers).map(k => ({ name: k, value: extraCaps.headers[k] })) : [{}];
  const cookies = extraCaps.cookies ? Object.keys(extraCaps.cookies).map(k => ({ name: k, value: extraCaps.cookies[k] })) : [{}];

  return new Schedule({
    ...schedule,
    day,
    minutes,
    hour,
    channel,
    nextExecutionTime,
    device: options.device,
    options,
    advancedOptions: !!options.extraCaps,
    bypassCSP: options.bypassCSP,
    network: options.network,
    headers,
    cookies,
    basicAuth: extraCaps.basicAuth,

    slack: slack.size > 0,
    slackInput: slack.map(i => parseInt(i.value)).toJS(),
    
    email: email.size > 0,
    emailInput: email.map(i => i.value).toJS(),
    
    webhook: webhook.size > 0,
    webhookInput: webhook.map(i => parseInt(i.value)).toJS(),
    
    hasNotification: !!slack || !!email || !!webhook
  });
}

function getObjetctFromArr(arr) {
  const obj = {}
  for (var i = 0; i < arr.length; i++)   {
    const temp = arr[i];
    obj[temp.name] = temp.value
  }
  return obj;
}

Schedule.prototype.toData = function toData() {
  const {
    name, schedulerId, environmentId, device, options, bypassCSP, network, headers, cookies, basicAuth
  } = this;

  const js = this.toJS();
  options.device = device;
  options.bypassCSP = bypassCSP;
  options.network = network;

  options.extraCaps = { 
    headers: getObjetctFromArr(headers),
    cookies: getObjetctFromArr(cookies),
    basicAuth
  };

  if (js.slack && js.slackInput)
    options.message = js.slackInput.map(i => ({ type: 'slack', value: i }))   
  if (js.email && js.emailInput)
    options.message = options.message.concat(js.emailInput.map(i => ({ type: 'email', value: i })))    
  if (js.webhook && js.webhookInput)
    options.message = options.message.concat(js.webhookInput.map(i => ({ type: 'webhook', value: i })))    

  let day = this.day;
  let hour = undefined;
  let minutes = this.minutes;
  if (day !== -2) {
    const utcOffset = new Date().getTimezoneOffset();
    minutes = (this.hour * 60) + utcOffset;
    // minutes += utcOffset;
    minutes = minutes < 0 ? minutes + 1440 : minutes;
  }
  // if (day !== -2) {
  //   const utcOffset = new Date().getTimezoneOffset();
  //   const hourOffset = Math.floor(utcOffset / 60);
  //   const minuteOffset = utcOffset - 60*hourOffset;

  //   minutes = minuteOffset;
  //   hour = this.hour + hourOffset;
  //   if (day !== -1) {
  //     const dayOffset = Math.floor(hour/24); // +/-1
  //     day = (day + dayOffset + 7) % 7;
  //   }
  //   hour = (hour + 24) % 24;
  // }

  delete js.slack;
  delete js.webhook;
  delete js.email;
  delete js.slackInput;
  delete js.webhookInput;
  delete js.emailInput;
  delete js.hasNotification;
  delete js.headers;
  delete js.cookies;

  delete js.device;
  delete js.extraCaps;

  // return {
  //   day, hour, name, minutes, schedulerId, environment, 
  // };
  return { ...js, day, hour, name, minutes, schedulerId, environmentId, options: options };
};

Schedule.prototype.exists = function exists() {
  return this.schedulerId !== undefined;
};

Schedule.prototype.valid = function validate() {
  return this.validateEvery;
};

Schedule.prototype.getInterval = function getInterval() {
  const DAY = List(DAYS).filter(item => item.value === this.day).first();

  if (DAY.value === -2) {
    return DAY.text + ' ' + this.minutes + ' Minutes'; // Every 30 minutes
  }

  const HOUR = List(HOURS).filter(item => item.value === this.hour).first();
  return DAY.text + ' ' + HOUR.text; // Everyday/Sunday 2 AM;
};

export default fromJS;

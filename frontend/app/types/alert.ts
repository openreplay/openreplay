import { notEmptyString, validateNumber } from 'App/validate';
import { alertMetrics as metrics, alertConditions as conditions } from 'App/constants';
import { makeAutoObservable } from 'mobx'

const metricsMap = {}
const conditionsMap = {}
// @ts-ignore
metrics.forEach(m => { metricsMap[m.value] = m });
// @ts-ignore
conditions.forEach(c => { conditionsMap[c.value] = c });

export interface IAlert {
  alertId: string;
  projectId?: string;
  name: string;
  description: string;
  active: boolean;
  currentPeriod: number;
  previousPeriod: number;
  detectionMethod: string;
  detection_method?: string;
  change: string;
  seriesName: string;
  query: { left: string, operator: string, right: string };
  options: { currentPeriod: number, previousPeriod: number, message: {type: string, value: string}[] };
  createdAt?: number;
  slack: boolean;
  slackInput: string[];
  webhook: boolean;
  webhookInput: string[];
  email: boolean;
  emailInput: string[];
  msteams: boolean;
  msteamsInput: string[];
  hasNotification: boolean;
  metric: { unit: any };
  condition: string;
}

const getDefaults = () => ({
  alertId: '',
  projectId: undefined,
  name: 'Untitled Alert',
  description: '',
  active: true,
  currentPeriod: 15,
  previousPeriod: 15,
  detectionMethod: 'threshold',
  change: 'change',
  query: { left: '', operator: '', right: '' },
  options: { currentPeriod: 15, previousPeriod: 15 },
  createdAt: undefined,

  slack: false,
  slackInput: [],
  webhook: false,
  webhookInput: [],
  email: false,
  emailInput: [],
  msteams: false,
  msteamsInput: [],
  hasNotification: false,
  metric: '',
  condition: '',
}) as unknown as IAlert

export default class Alert {
  alertId: IAlert["alertId"]
  projectId?: IAlert["projectId"]
  name: IAlert["name"]
  description: IAlert["description"]
  active: IAlert["active"]
  currentPeriod: IAlert["currentPeriod"]
  previousPeriod: IAlert["previousPeriod"]
  detectionMethod: IAlert["detectionMethod"]
  detection_method: IAlert["detection_method"]
  change: IAlert["change"]
  seriesName: IAlert["seriesName"]
  query: IAlert["query"]
  options: IAlert["options"]
  createdAt?: IAlert["createdAt"]
  slack: IAlert["slack"]
  slackInput: IAlert["slackInput"]
  webhook: IAlert["webhook"]
  webhookInput: IAlert["webhookInput"]
  email: IAlert["email"]
  emailInput: IAlert["emailInput"]
  msteams: IAlert["msteams"]
  msteamsInput: IAlert["msteamsInput"]
  hasNotification: IAlert["hasNotification"]
  metric: IAlert["metric"]
  condition: IAlert["condition"]
  isExists = false

  constructor(item: Partial<IAlert> = {}, isExists: boolean) {
    const defaults = getDefaults()
    Object.assign(defaults, item)

    const options = defaults.options || { currentPeriod: 15, previousPeriod: 15, message: [] };
    const query = defaults.query || { left: '', operator: '', right: ''};

    const slack = options.message?.filter(i => i.type === 'slack') || [];
    const email = options.message?.filter(i => i.type === 'email') || [];
    const webhook = options.message?.filter(i => i.type === 'webhook') || [];
    const msteams = options.message?.filter(i => i.type === 'msteams') || [];

    Object.assign(this, {
      ...defaults,
      // @ts-ignore
      metric: metricsMap[query.left],
      alertId: String(defaults.alertId),
      // @ts-ignore TODO
      condition: defaults.query ? conditionsMap[defaults.query.operator] : {},
      detectionMethod: defaults.detectionMethod || defaults.detection_method,
      query: query,
      options: options,
      previousPeriod: options.previousPeriod,
      currentPeriod: options.currentPeriod,

      slack: slack.length > 0,
      slackInput: slack.map(i => parseInt(i.value)),

      msteams: msteams.length > 0,
      msteamsInput: msteams.map(i => parseInt(i.value)),

      email: email.length > 0,
      emailInput: email.map(i => i.value),

      webhook: webhook.length > 0,
      webhookInput: webhook.map(i => parseInt(i.value)),

      hasNotification: !!slack || !!email || !!webhook,
      isExists,
    })

    makeAutoObservable(this)
  }

  validate() {
    return notEmptyString(this.name) &&
      this.query.left && this.query.right && validateNumber(this.query.right) && parseInt(this.query.right, 10) > 0 && this.query.operator &&
      (this.slack ? this.slackInput.length > 0 : true) &&
      (this.email ? this.emailInput.length > 0 : true) &&
      (this.msteams ? this.msteamsInput.length > 0 : true) &&
      (this.webhook ? this.webhookInput.length > 0 : true);
  }


  toData() {
    const js = { ...this };

    const options = { message: [], previousPeriod: 0, currentPeriod: 0 }
    if (js.slack && js.slackInput)
      // @ts-ignore
      options.message = options.message.concat(js.slackInput.map(i => ({ type: 'slack', value: i })))
    if (js.email && js.emailInput)
      // @ts-ignore
      options.message = options.message.concat(js.emailInput.map(i => ({ type: 'email', value: i })))
    if (js.webhook && js.webhookInput)
      // @ts-ignore
      options.message = options.message.concat(js.webhookInput.map(i => ({ type: 'webhook', value: i })))
    if (js.msteams && js.msteamsInput)
      // @ts-ignore
      options.message = options.message.concat(js.msteamsInput.map(i => ({ type: 'msteams', value: i })))

    options.previousPeriod = js.previousPeriod
    options.currentPeriod = js.currentPeriod

    js.detection_method = js.detectionMethod;
    // @ts-ignore
    delete js.slack;
    // @ts-ignore
    delete js.webhook;
    // @ts-ignore
    delete js.email;
    // @ts-ignore
    delete js.slackInput;
    // @ts-ignore
    delete js.webhookInput;
    // @ts-ignore
    delete js.emailInput;
    // @ts-ignore
    delete js.msteams;
    // @ts-ignore
    delete js.msteamsInput;
    // @ts-ignore
    delete js.hasNotification;
    // @ts-ignore
    delete js.metric;
    // @ts-ignore
    delete js.condition;
    // @ts-ignore
    delete js.currentPeriod;
    // @ts-ignore
    delete js.previousPeriod;

    return { ...js, options: options };
  }

  exists() {
    return this.isExists
  }
}

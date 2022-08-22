import Record from 'Types/Record';
import { notEmptyString, validateName, validateNumber, validateEmail } from 'App/validate';
import { List, Map } from 'immutable';
import { alertMetrics as metrics, alertConditions as conditions } from 'App/constants';
// import Filter from './filter';

const metricsMap = {}
const conditionsMap = {}
metrics.forEach(m => { metricsMap[m.value] = m });
conditions.forEach(c => { conditionsMap[c.value] = c });

export default Record({
  alertId: '',
  projectId: undefined,
  name: 'Untitled Alert',
  description: '',
  active: true,
  currentPeriod: 15,
  previousPeriod: 15,
  detectionMethod: 'threshold',
  change: 'change',
  query: Map({ left: '', operator: '', right: ''}),
  options: Map({ currentPeriod: 15, previousPeriod: 15 }),
  createdAt: undefined,

  slack: false,
  slackInput: [],
  webhook: false,
  webhookInput: [],
  email: false,
  emailInput: [],
  hasNotification: false,
  metric: '',
  condition: '',
}, {
  idKey: 'alertId',
  methods: {
    validate() {
      return notEmptyString(this.name) &&
        this.query.left && this.query.right && validateNumber(this.query.right) && this.query.right > 0 && this.query.operator &&
        (this.slack ? this.slackInput.length > 0 : true) &&
        (this.email ? this.emailInput.length > 0 : true) &&
        (this.webhook ? this.webhookInput.length > 0 : true);
    },
    toData() {
      const js = this.toJS();

      const options = { message: [] }
      if (js.slack && js.slackInput)
        options.message = options.message.concat(js.slackInput.map(i => ({ type: 'slack', value: i })))
        // options.message.push({ type: 'slack', value: js.slackInput })
      if (js.email && js.emailInput)
        options.message = options.message.concat(js.emailInput.map(i => ({ type: 'email', value: i })))
        // options.message.push({ type: 'email', value: js.emailInput })
      if (js.webhook && js.webhookInput)
        options.message = options.message.concat(js.webhookInput.map(i => ({ type: 'webhook', value: i })))
        // options.message.push({ type: 'webhook', value: js.webhookInput })

      options.previousPeriod = js.previousPeriod
      options.currentPeriod = js.currentPeriod

      js.detection_method = js.detectionMethod;
      delete js.slack;
      delete js.webhook;
      delete js.email;
      delete js.slackInput;
      delete js.webhookInput;
      delete js.emailInput;
      delete js.hasNotification;
      delete js.metric;
      delete js.condition;
      delete js.currentPeriod;
      delete js.previousPeriod;
      
      return { ...js, options: options };
    },
  },
  fromJS: (item) => {
    const options = item.options || { currentPeriod: 15, previousPeriod: 15, message: [] };
    const query = item.query || { left: '', operator: '', right: ''};
    
    const slack = List(options.message).filter(i => i.type === 'slack');
    const email = List(options.message).filter(i => i.type === 'email');
    const webhook = List(options.message).filter(i => i.type === 'webhook');

    return { 
      ...item,
      metric: metricsMap[query.left],
      condition: item.query ? conditionsMap[item.query.operator] : {},
      detectionMethod: item.detectionMethod || item.detection_method,
      query: query,
      options: options,
      previousPeriod: options.previousPeriod,
      currentPeriod: options.currentPeriod,
      
      slack: slack.size > 0,
      slackInput: slack.map(i => parseInt(i.value)).toJS(),
      
      email: email.size > 0,
      emailInput: email.map(i => i.value).toJS(),
      
      webhook: webhook.size > 0,
      webhookInput: webhook.map(i => parseInt(i.value)).toJS(),
      
      hasNotification: !!slack || !!email || !!webhook
    }
  },
});

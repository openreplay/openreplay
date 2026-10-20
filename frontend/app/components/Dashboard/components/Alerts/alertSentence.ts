import type Alert from 'Types/alert';

import { numberWithCommas } from 'App/utils';

export const getThreshold = (threshold: number) => {
  if (threshold === 15) return '15 Minutes';
  if (threshold === 30) return '30 Minutes';
  if (threshold === 60) return '1 Hour';
  if (threshold === 120) return '2 Hours';
  if (threshold === 240) return '4 Hours';
  if (threshold === 1440) return '1 Day';
};

export const getNotifyChannel = (
  alert: Record<string, any>,
  webhooks: Array<any>,
) => {
  // names of the channels the webhooks list knows; unknown ids (the list
  // still loading, or a deleted hook) are left out rather than printed
  const channels = (ids: number[], type: string, mark = '') => {
    const names = ids
      .map((id) => webhooks.find((h) => h.webhookId === id && h.type === type))
      .filter((h) => h?.name)
      .map((h) => `${mark}${h.name}`);
    return names.length ? ` (${names.join(', ')})` : '';
  };
  let str = '';
  if (alert.slack) {
    str = 'Slack';
    str += channels(alert.slackInput, 'slack', '#');
  }
  if (alert.msteams) {
    str += `${str === '' ? '' : ' and '}MS Teams`;
    str += channels(alert.msteamsInput, 'msteams');
  }
  if (alert.email) {
    str +=
      (str === '' ? '' : ' and ') +
      (alert.emailInput.length > 1 ? 'Emails' : 'Email');
    str +=
      alert.emailInput.length > 0 ? ` (${alert.emailInput.join(', ')})` : '';
  }
  if (alert.webhook) str += `${str === '' ? '' : ' and '}Webhook`;
  if (str === '') return 'OpenReplay';

  return str;
};

/** The rule as one sentence, as the list row prints it. */
export function alertSentence(
  alert: Alert,
  webhooks: Array<any>,
  trigger?: string,
): string {
  const unit = alert.change === 'percent' ? '%' : (alert.metric?.unit ?? '');
  const base = `When the ${alert.detectionMethod} of ${trigger ?? alert.seriesName ?? alert.query.left} is ${alert.query.operator}${numberWithCommas(alert.query.right)}${unit} over the past ${getThreshold(alert.currentPeriod)}`;
  const prev =
    alert.detectionMethod === 'change'
      ? ` compared to the previous ${getThreshold(alert.previousPeriod)}`
      : '';
  return `${base}${prev}, notify via ${getNotifyChannel(alert, webhooks)}.`;
}

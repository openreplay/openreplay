import { ExternalLink } from '@/ui/actions/ExternalLink';
import { Notice } from '@/ui/feedback/Notice';
import { Input } from '@/ui/inputs/input';
import { MultiSelect } from '@/ui/inputs/multi-select';
import { SimpleSelect } from '@/ui/inputs/select';
import { TagInput } from '@/ui/inputs/tag-input';
import { Segmented } from '@/ui/inputs/toggle-group';
import { observer } from 'mobx-react-lite';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { alertConditions } from 'App/constants';
import { SLACK, TEAMS, WEBHOOK } from 'App/constants/schedule';
import { useStore } from 'App/mstore';
import type { TriggerOption } from 'App/mstore/alertsStore';
import { validateEmail } from 'App/validate';

import '../../product-analytics.css';
import { MetricPicker } from './MetricPicker';

type Channel = 'slack' | 'msteams' | 'email' | 'webhook';

/** The steps of an alert, editing `alertsStore.instance` in place. */
function AlertFields({
  triggerOptions,
  withName,
}: {
  triggerOptions: TriggerOption[];
  withName?: boolean;
}) {
  const { t } = useTranslation();
  const { alertsStore, settingsStore, userStore } = useStore();
  const { instance, edit } = alertsStore;
  const { webhooks } = settingsStore;
  const change = instance.detectionMethod === 'change';
  const metric = triggerOptions.find((o) => o.value === instance.query.left);
  const metricUnit = metric?.unit === 'count' ? '' : (metric?.unit ?? '');
  const unit = change && instance.change === 'percent' ? '%' : metricUnit;
  const setQuery = (patch: Record<string, unknown>) =>
    edit({ query: { ...instance.query, ...patch } } as any);

  const channels = (type: string) =>
    webhooks
      .filter((h: any) => h.type === type)
      .map((h: any) => ({ value: String(h.webhookId), label: h.name }));
  const slack = channels(SLACK);
  const teams = channels(TEAMS);
  const hooks = channels(WEBHOOK);
  const periods = [
    { value: '15', label: t('15 minutes') },
    { value: '30', label: t('30 minutes') },
    { value: '60', label: t('1 hour') },
    { value: '120', label: t('2 hours') },
    { value: '240', label: t('4 hours') },
    { value: '1440', label: t('1 day') },
  ];
  const ids = (list: Array<string | number> = []) => list.map(String);
  const nums = (list: string[]) => list.map(Number);

  const channelOptions: { value: Channel; label: string; show: boolean }[] = [
    { value: 'slack', label: t('Slack'), show: slack.length > 0 },
    { value: 'msteams', label: t('MS Teams'), show: teams.length > 0 },
    { value: 'email', label: t('Email'), show: true },
    { value: 'webhook', label: t('Webhook'), show: true },
  ];
  const chosenChannels = channelOptions
    .filter((c) => (instance as any)[c.value])
    .map((c) => c.value);
  const setChannels = (next: Channel[]) => {
    channelOptions.forEach((c) => {
      const on = next.includes(c.value);
      if (!!(instance as any)[c.value] !== on) edit({ [c.value]: on } as any);
    });
  };
  // a new alert starts with its name, so the steps count from there
  const off = withName ? 1 : 0;

  return (
    <div className="m-alertf">
      {withName ? (
        <Step n={1} title={t('Name')}>
          <Input
            value={instance.name}
            placeholder={t('What this alert watches')}
            aria-label={t('Alert name')}
            onChange={(e) => edit({ name: e.target.value })}
          />
        </Step>
      ) : null}
      <Step n={1 + off} title={t('Alert based on')}>
        <Segmented<'threshold' | 'change'>
          value={instance.detectionMethod as 'threshold' | 'change'}
          onChange={(v) => edit({ detectionMethod: v })}
          ariaLabel={t('Detection method')}
          options={[
            { value: 'threshold', label: t('Threshold') },
            { value: 'change', label: t('Change') },
          ]}
        />
        <p className="m-alertf__help">
          {change
            ? t(
                'Eg. Alert me if % change of memory.avg is greater than 10% over the past 4 hours compared to the previous 4 hours.',
              )
            : t(
                'Eg. When Threshold is above 1ms over the past 15mins, notify me through Slack #foss-notifications.',
              )}
        </p>
      </Step>

      <Step n={2 + off} title={t('Condition')}>
        {change ? (
          <div className="m-alertf__row">
            <span className="m-alertf__word">{t('Trigger when')}</span>
            <SimpleSelect<string>
              value={instance.change}
              onChange={(v) => v && alertsStore.changeUnit({ value: v })}
              ariaLabel={t('Kind of change')}
              options={[
                { value: 'change', label: t('change') },
                { value: 'percent', label: t('% change') },
              ]}
            />
          </div>
        ) : null}
        <div className="m-alertf__row">
          <span className="m-alertf__word">
            {change ? t('of') : t('Trigger when')}
          </span>
          <span className="m-alertf__metric">
            <MetricPicker
              options={triggerOptions}
              value={instance.query.left ?? undefined}
              onChange={(o) => setQuery({ left: o.value })}
            />
          </span>
          <span className="m-alertf__word">{t('is')}</span>
          <SimpleSelect<string>
            placeholder={t('Select condition')}
            ariaLabel={t('Condition')}
            value={instance.query.operator || undefined}
            onChange={(v) => v && setQuery({ operator: v })}
            options={alertConditions.map((c) => ({
              value: c.value,
              label: t(c.label),
            }))}
          />
          <span className="m-alertf__value relative inline-flex items-center">
            <Input
              className={unit ? 'pr-8' : undefined}
              placeholder={t('Specify value')}
              aria-label={t('Threshold value')}
              inputMode="decimal"
              value={instance.query.right ?? ''}
              onChange={(e) => setQuery({ right: e.target.value })}
            />
            {unit ? (
              <span className="pointer-events-none absolute right-4 text-xs text-content-muted">
                {unit}
              </span>
            ) : null}
          </span>
        </div>
        <div className="m-alertf__row">
          <span className="m-alertf__word">{t('over the past')}</span>
          <SimpleSelect<string>
            placeholder={t('Select timeframe')}
            ariaLabel={t('Period')}
            value={String(instance.currentPeriod)}
            onChange={(v) => v && edit({ currentPeriod: Number(v) })}
            options={periods}
          />
          {change ? (
            <>
              <span className="m-alertf__word">
                {t('compared to previous')}
              </span>
              <SimpleSelect<string>
                ariaLabel={t('Compared to')}
                value={String(instance.previousPeriod)}
                onChange={(v) => v && edit({ previousPeriod: Number(v) })}
                options={periods}
              />
            </>
          ) : null}
        </div>
      </Step>

      <Step n={3 + off} title={t('Notify through')}>
        <p className="m-alertf__help">
          {t(
            "You'll be notified in app. Additionally opt in to receive alerts on:",
          )}
        </p>
        <MultiSelect<Channel>
          className="m-alertf__notify"
          placeholder={t('Choose where')}
          ariaLabel={t('Notify through')}
          value={chosenChannels}
          onChange={setChannels}
          options={channelOptions
            .filter((c) => c.show || chosenChannels.includes(c.value))
            .map((c) => ({ value: c.value, label: c.label }))}
        />
        {instance.slack ? (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">
              {t('Slack')}
            </span>
            <MultiSelect<string>
              className="m-alertf__wide"
              placeholder={t('Select channel')}
              ariaLabel={t('Slack channels')}
              value={ids(instance.slackInput)}
              onChange={(v) => edit({ slackInput: nums(v) } as any)}
              options={slack}
            />
          </div>
        ) : null}
        {instance.msteams ? (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">
              {t('MS Teams')}
            </span>
            <MultiSelect<string>
              className="m-alertf__wide"
              placeholder={t('Select channel')}
              ariaLabel={t('Teams channels')}
              value={ids(instance.msteamsInput)}
              onChange={(v) => edit({ msteamsInput: nums(v) } as any)}
              options={teams}
            />
          </div>
        ) : null}
        {instance.email ? (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">
              {t('Email')}
            </span>
            <TagInput
              className="m-alertf__wide"
              placeholder={t('Type an address and press Enter')}
              ariaLabel={t('Email addresses')}
              value={instance.emailInput ?? []}
              onChange={(v) => edit({ emailInput: v } as any)}
              accept={(text) => validateEmail(text)}
            />
          </div>
        ) : null}
        {instance.email && !userStore.account.smtp ? (
          <Notice kind="info">
            {t('SMTP is not configured, so email alerts are not sent.')}{' '}
            <ExternalLink
              className="link"
              href="https://docs.openreplay.com/configuration/configure-smtp"
            >
              {t('How to configure it')}
            </ExternalLink>
          </Notice>
        ) : null}
        {instance.webhook ? (
          <div className="m-alertf__row">
            <span className="m-alertf__word m-alertf__word--label">
              {t('Webhook')}
            </span>
            <MultiSelect<string>
              className="m-alertf__wide"
              placeholder={t('Select webhook')}
              ariaLabel={t('Webhook')}
              value={ids(instance.webhookInput)}
              onChange={(v) => edit({ webhookInput: nums(v) } as any)}
              options={hooks}
            />
          </div>
        ) : null}
      </Step>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="m-alertf__step">
      <span className="m-alertf__index" aria-hidden="true">
        {n}
      </span>
      <div className="m-alertf__body">
        <h3 className="m-alertf__title">{title}</h3>
        {children}
      </div>
    </section>
  );
}

export default observer(AlertFields);

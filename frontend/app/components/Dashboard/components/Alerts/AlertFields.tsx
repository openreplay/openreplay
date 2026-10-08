import { Notice } from '@/ui/feedback/Notice';
import { Checkbox } from '@/ui/inputs/checkbox';
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
import { validateEmail } from 'App/validate';

import '../../product-analytics.css';

interface Option {
  value: string | number;
  label: string;
  unit?: string;
}

/** The three steps of an alert, editing `alertsStore.instance` in place. */
function AlertFields({
  triggerOptions,
  withName,
}: {
  triggerOptions: Option[];
  withName?: boolean;
}) {
  const { t } = useTranslation();
  const { alertsStore, settingsStore, userStore } = useStore();
  const { instance, edit } = alertsStore;
  const { webhooks } = settingsStore;
  const change = instance.detectionMethod === 'change';
  const metric = triggerOptions.find((o) => o.value === instance.query.left);
  const unit =
    change && instance.change === 'percent' ? '%' : (metric?.unit ?? '');
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

  const toggles: { key: string; label: string; show: boolean }[] = [
    { key: 'slack', label: t('Slack'), show: slack.length > 0 },
    { key: 'msteams', label: t('MS Teams'), show: teams.length > 0 },
    { key: 'email', label: t('Email'), show: true },
    { key: 'webhook', label: t('Webhook'), show: true },
  ];

  return (
    <div className="m-alertf">
      {withName ? (
        <Step n={0} title={t('Name')}>
          <Input
            value={instance.name}
            placeholder={t('What this alert watches')}
            aria-label={t('Alert name')}
            onChange={(e) => edit({ name: e.target.value })}
          />
        </Step>
      ) : null}
      <Step n={1} title={t('Alert based on')}>
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

      <Step n={2} title={t('Condition')}>
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
          <SimpleSelect<string>
            className="m-alertf__metric"
            placeholder={t('Select metric')}
            ariaLabel={t('Metric')}
            value={
              instance.query.left != null
                ? String(instance.query.left)
                : undefined
            }
            onChange={(v) => {
              const hit = triggerOptions.find((o) => String(o.value) === v);
              setQuery({ left: hit ? hit.value : v });
            }}
            options={triggerOptions.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
          />
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

      <Step n={3} title={t('Notify through')}>
        <p className="m-alertf__help">
          {t(
            "You'll be notified in app. Additionally opt in to receive alerts on:",
          )}
        </p>
        <div className="m-alertf__channels">
          {toggles
            .filter((c) => c.show)
            .map((c) => (
              <label
                key={c.key}
                className="inline-flex cursor-pointer items-center gap-3 text-sm text-content-primary"
              >
                <Checkbox
                  checked={!!(instance as any)[c.key]}
                  onCheckedChange={(v) => edit({ [c.key]: !!v } as any)}
                />
                {c.label}
              </label>
            ))}
        </div>
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
            <a
              className="link"
              href="https://docs.openreplay.com/configuration/configure-smtp"
              target="_blank"
              rel="noreferrer"
            >
              {t('How to configure it')}
            </a>
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
        {n || '·'}
      </span>
      <div className="m-alertf__body">
        <h3 className="m-alertf__title">{title}</h3>
        {children}
      </div>
    </section>
  );
}

export default observer(AlertFields);

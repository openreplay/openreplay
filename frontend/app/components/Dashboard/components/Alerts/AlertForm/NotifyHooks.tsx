import React from 'react';
import { Checkbox } from 'UI';
import { observer } from 'mobx-react-lite';
import DropdownChips from '../DropdownChips';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

interface INotifyHooks {
  instance: Alert;
  onChangeCheck: (e: React.ChangeEvent<HTMLInputElement>) => void;
  slackChannels: Array<any>;
  msTeamsChannels: Array<any>;
  validateEmail: (value: string) => boolean;
  edit: (data: any) => void;
  hooks: Array<any>;
  isSmtp: boolean;
}

function NotifyHooks({
  instance,
  onChangeCheck,
  slackChannels,
  validateEmail,
  msTeamsChannels,
  hooks,
  edit,
  isSmtp,
}: INotifyHooks) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="flex items-center my-4">
        {slackChannels.length > 0 && (
          <Checkbox
            name="slack"
            className="mr-8"
            type="checkbox"
            checked={instance.slack}
            onClick={onChangeCheck}
            label={t('Slack')}
          />
        )}
        {msTeamsChannels.length > 0 && (
          <Checkbox
            name="msteams"
            className="mr-8"
            type="checkbox"
            checked={instance.msteams}
            onClick={onChangeCheck}
            label="MS Teams"
          />
        )}
        <Checkbox
          name="email"
          type="checkbox"
          checked={instance.email}
          onClick={onChangeCheck}
          className="mr-8"
          label={t('Email')}
        />
        <Checkbox
          name="webhook"
          type="checkbox"
          checked={instance.webhook}
          onClick={onChangeCheck}
          label={t('Webhook')}
        />
      </div>

      {instance.slack && (
        <div className="flex items-start my-4">
          <label className="w-1/6 shrink-0 font-normal pt-2">
            {t('Slack')}
          </label>
          <div className="w-2/6">
            <DropdownChips
              fluid
              selected={instance.slackInput}
              options={slackChannels}
              placeholder={t('Select Channel')}
              // @ts-ignore
              onChange={(selected) => edit({ slackInput: selected })}
            />
          </div>
        </div>
      )}

      {instance.msteams && (
        <div className="flex items-start my-4">
          <label className="w-1/6 shrink-0 font-normal pt-2">
            {t('MS Teams')}
          </label>
          <div className="w-2/6">
            <DropdownChips
              fluid
              selected={instance.msteamsInput}
              options={msTeamsChannels}
              placeholder={t('Select Channel')}
              // @ts-ignore
              onChange={(selected) => edit({ msteamsInput: selected })}
            />
          </div>
        </div>
      )}

      {instance.email && (
        <div className="flex items-start my-4">
          <label className="w-1/6 shrink-0 font-normal pt-2">
            {t('Email')}
          </label>
          <div className="w-2/6">
            <DropdownChips
              textFiled
              validate={validateEmail}
              selected={instance.emailInput}
              placeholder={t('Type and press Enter key')}
              // @ts-ignore
              onChange={(selected) => edit({ emailInput: selected })}
            />

            {!isSmtp && (
              <div className={cn('mb-4 p-2 bg-amber rounded-sm')}>
                {t('SMTP is not configured (see')}&nbsp;
                <a
                  className="link"
                  href="https://docs.openreplay.com/configuration/configure-smtp"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('here')}
                </a>
                {')'}
              </div>
            )}
          </div>
        </div>
      )}

      {instance.webhook && (
        <div className="flex items-start my-4">
          <label className="w-1/6 shrink-0 font-normal pt-2">
            {t('Webhook')}
          </label>
          <div className="w-2/6">
            <DropdownChips
              fluid
              selected={instance.webhookInput}
              options={hooks}
              placeholder={t('Select Webhook')}
              // @ts-ignore
              onChange={(selected) => edit({ webhookInput: selected })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default observer(NotifyHooks);

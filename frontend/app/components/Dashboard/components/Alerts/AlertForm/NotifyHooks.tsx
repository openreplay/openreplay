import React from 'react';
import { Checkbox } from 'UI';
import DropdownChips from '../DropdownChips';

interface INotifyHooks {
  instance: Alert;
  onChangeCheck: (e: React.ChangeEvent<HTMLInputElement>) => void;
  slackChannels: Array<any>;
  validateEmail: (value: string) => boolean;
  edit: (data: any) => void;
  hooks: Array<any>;
}

function NotifyHooks({
  instance,
  onChangeCheck,
  slackChannels,
  validateEmail,
  hooks,
  edit,
}: INotifyHooks) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center my-4">
        <Checkbox
          name="slack"
          className="mr-8"
          type="checkbox"
          checked={instance.slack}
          onClick={onChangeCheck}
          label="Slack"
        />
        <Checkbox
          name="email"
          type="checkbox"
          checked={instance.email}
          onClick={onChangeCheck}
          className="mr-8"
          label="Email"
        />
        <Checkbox
          name="webhook"
          type="checkbox"
          checked={instance.webhook}
          onClick={onChangeCheck}
          label="Webhook"
        />
      </div>

      {instance.slack && (
        <div className="flex items-start my-4">
          <label className="w-1/6 flex-shrink-0 font-normal pt-2">{'Slack'}</label>
          <div className="w-2/6">
            <DropdownChips
              fluid
              selected={instance.slackInput}
              options={slackChannels}
              placeholder="Select Channel"
              // @ts-ignore
              onChange={(selected) => edit({ slackInput: selected })}
            />
          </div>
        </div>
      )}

      {instance.email && (
        <div className="flex items-start my-4">
          <label className="w-1/6 flex-shrink-0 font-normal pt-2">{'Email'}</label>
          <div className="w-2/6">
            <DropdownChips
              textFiled
              validate={validateEmail}
              selected={instance.emailInput}
              placeholder="Type and press Enter key"
              // @ts-ignore
              onChange={(selected) => edit({ emailInput: selected })}
            />
          </div>
        </div>
      )}

      {instance.webhook && (
        <div className="flex items-start my-4">
          <label className="w-1/6 flex-shrink-0 font-normal pt-2">{'Webhook'}</label>
          <div className="w-2/6">
            <DropdownChips
              fluid
              selected={instance.webhookInput}
              options={hooks}
              placeholder="Select Webhook"
              // @ts-ignore
              onChange={(selected) => edit({ webhookInput: selected })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default NotifyHooks;

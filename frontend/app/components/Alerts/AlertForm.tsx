import React, { useEffect } from 'react';
import { Form, Input, SegmentSelection, Checkbox, Icon } from 'UI';
import { alertConditions as conditions } from 'App/constants';
import { validateEmail } from 'App/validate';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import Select from 'Shared/Select';
import { Button } from 'antd';
import DropdownChips from './DropdownChips';
import stl from './alertForm.module.css';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const thresholdOptions = (t: TFunction) => [
  { label: t('15 minutes'), value: 15 },
  { label: t('30 minutes'), value: 30 },
  { label: t('1 hour'), value: 60 },
  { label: t('2 hours'), value: 120 },
  { label: t('4 hours'), value: 240 },
  { label: t('1 day'), value: 1440 },
];

const changeOptions = (t: TFunction) => [
  { label: t('change'), value: 'change' },
  { label: t('% change'), value: 'percent' },
];

function Circle({ text }: { text: string }) {
  return (
    <div className="circle mr-4 w-6 h-6 rounded-full bg-gray-light flex items-center justify-center">
      {text}
    </div>
  );
}

function Section({
  index,
  title,
  description,
  content,
}: {
  index: string;
  title: string;
  description?: string;
  content: any;
}) {
  return (
    <div className="w-full">
      <div className="flex items-start">
        <Circle text={index} />
        <div>
          <span className="font-medium">{title}</span>
          {description && (
            <div className="text-sm color-gray-medium">{description}</div>
          )}
        </div>
      </div>

      <div className="ml-10">{content}</div>
    </div>
  );
}

function AlertForm(props) {
  const { t } = useTranslation();
  const {
    slackChannels,
    msTeamsChannels,
    webhooks,
    onDelete,
    style = { height: "calc('100vh - 40px')" },
  } = props;
  const { alertsStore, metricStore } = useStore();
  const { triggerOptions: allTriggerSeries, loading } = alertsStore;

  const triggerOptions =
    metricStore.instance.series.length > 0
      ? allTriggerSeries
          .filter(
            (s) =>
              metricStore.instance.series.findIndex(
                (ms) => ms.seriesId === s.value,
              ) !== -1,
          )
          .map((v) => {
            const labelArr = v.label.split('.');
            labelArr.shift();
            return {
              ...v,
              label: labelArr.join('.'),
            };
          })
      : allTriggerSeries;
  const { instance } = alertsStore;
  const deleting = loading;

  const write = ({ target: { value, name } }) =>
    alertsStore.edit({ [name]: value });
  const writeOption = (e, { name, value }) =>
    alertsStore.edit({ [name]: value.value });
  const onChangeCheck = ({ target: { checked, name } }) =>
    alertsStore.edit({ [name]: checked });

  useEffect(() => {
    void alertsStore.fetchTriggerOptions();
  }, []);

  const writeQueryOption = (e, { name, value }) => {
    const { query } = instance;
    alertsStore.edit({ query: { ...query, [name]: value } });
  };

  const writeQuery = ({ target: { value, name } }) => {
    const { query } = instance;
    alertsStore.edit({ query: { ...query, [name]: value } });
  };

  const metric =
    instance && instance.query.left
      ? triggerOptions.find((i) => i.value === instance.query.left)
      : null;
  const unit = metric ? metric.unit : '';
  const isThreshold = instance.detectionMethod === 'threshold';

  return (
    <Form
      className={cn('pb-10', stl.wrapper)}
      style={style}
      onSubmit={() => props.onSubmit(instance)}
      id="alert-form"
    >
      <div className={cn('-mx-6 px-6 pb-12')}>
        <input
          autoFocus
          className="text-lg border border-gray-light rounded w-full"
          name="name"
          style={{ fontSize: '18px', padding: '10px', fontWeight: '600' }}
          value={instance && instance.name}
          onChange={write}
          placeholder={t('Untiltled Alert')}
          id="name-field"
        />
        <div className="mb-8" />
        <Section
          index="1"
          title={t('What kind of alert do you want to set?')}
          content={
            <div>
              <SegmentSelection
                primary
                name="detectionMethod"
                className="my-3"
                onSelect={(e, { name, value }) =>
                  alertsStore.edit({ [name]: value })
                }
                value={{ value: instance.detectionMethod }}
                list={[
                  { name: t('Threshold'), value: 'threshold' },
                  { name: t('Change'), value: 'change' },
                ]}
              />
              <div className="text-sm color-gray-medium">
                {isThreshold &&
                  t(
                    'Eg. Alert me if memory.avg is greater than 500mb over the past 4 hours.',
                  )}
                {!isThreshold &&
                  t(
                    'Eg. Alert me if % change of memory.avg is greater than 10% over the past 4 hours compared to the previous 4 hours.',
                  )}
              </div>
              <div className="my-4" />
            </div>
          }
        />

        <hr className="my-8" />

        <Section
          index="2"
          title={t('Condition')}
          content={
            <div>
              {!isThreshold && (
                <div className="flex items-center my-3">
                  <label className="w-2/6 flex-shrink-0 font-normal">
                    {t('Trigger when')}
                  </label>
                  <Select
                    className="w-4/6"
                    placeholder="change"
                    options={changeOptions(t)}
                    name="change"
                    defaultValue={instance.change}
                    onChange={({ value }) =>
                      writeOption(null, { name: 'change', value })
                    }
                    id="change-dropdown"
                  />
                </div>
              )}

              <div className="flex items-center my-3">
                <label className="w-2/6 flex-shrink-0 font-normal">
                  {isThreshold ? t('Trigger when') : t('of')}
                </label>
                <Select
                  className="w-4/6"
                  placeholder={t('Select Metric')}
                  isSearchable
                  options={triggerOptions}
                  name="left"
                  value={triggerOptions.find(
                    (i) => i.value === instance.query.left,
                  )}
                  // onChange={ writeQueryOption }
                  onChange={({ value }) =>
                    writeQueryOption(null, { name: 'left', value: value.value })
                  }
                />
              </div>

              <div className="flex items-center my-3">
                <label className="w-2/6 flex-shrink-0 font-normal">
                  {t('is')}
                </label>
                <div className="w-4/6 flex items-center">
                  <Select
                    placeholder={t('Select Condition')}
                    options={conditions.map((c) => ({
                      ...c,
                      label: t(c.label),
                    }))}
                    name="operator"
                    defaultValue={instance.query.operator}
                    // onChange={ writeQueryOption }
                    onChange={({ value }) =>
                      writeQueryOption(null, {
                        name: 'operator',
                        value: value.value,
                      })
                    }
                  />
                  {unit && (
                    <>
                      <Input
                        className="px-4"
                        style={{ marginRight: '31px' }}
                        // label={{ basic: true, content: unit }}
                        // labelPosition='right'
                        name="right"
                        value={instance.query.right}
                        onChange={writeQuery}
                        placeholder="E.g. 3"
                      />
                      <span className="ml-2">{t('test')}</span>
                    </>
                  )}
                  {!unit && (
                    <Input
                      wrapperClassName="ml-2"
                      // className="pl-4"
                      name="right"
                      value={instance.query.right}
                      onChange={writeQuery}
                      placeholder="Specify value"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center my-3">
                <label className="w-2/6 flex-shrink-0 font-normal">
                  {t('over the past')}
                </label>
                <Select
                  className="w-2/6"
                  placeholder={t('Select timeframe')}
                  options={thresholdOptions(t)}
                  name="currentPeriod"
                  defaultValue={instance.currentPeriod}
                  // onChange={ writeOption }
                  onChange={({ value }) =>
                    writeOption(null, { name: 'currentPeriod', value })
                  }
                />
              </div>
              {!isThreshold && (
                <div className="flex items-center my-3">
                  <label className="w-2/6 flex-shrink-0 font-normal">
                    {t('compared to previous')}
                  </label>
                  <Select
                    className="w-2/6"
                    placeholder={t('Select timeframe')}
                    options={thresholdOptions(t)}
                    name="previousPeriod"
                    defaultValue={instance.previousPeriod}
                    // onChange={ writeOption }
                    onChange={({ value }) =>
                      writeOption(null, { name: 'previousPeriod', value })
                    }
                  />
                </div>
              )}
            </div>
          }
        />

        <hr className="my-8" />

        <Section
          index="3"
          title={t('Notify Through')}
          description={t(
            "You'll be noticed in app notifications. Additionally opt in to receive alerts on:",
          )}
          content={
            <div className="flex flex-col">
              <div className="flex items-center my-4">
                <Checkbox
                  name="slack"
                  className="mr-8"
                  type="checkbox"
                  checked={instance.slack}
                  onClick={onChangeCheck}
                  label={t('Slack')}
                />
                <Checkbox
                  name="msteams"
                  className="mr-8"
                  type="checkbox"
                  checked={instance.msteams}
                  onClick={onChangeCheck}
                  label={t('MS Teams')}
                />
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
                  <label className="w-2/6 flex-shrink-0 font-normal pt-2">
                    {t('Slack')}
                  </label>
                  <div className="w-4/6">
                    <DropdownChips
                      fluid
                      selected={instance.slackInput}
                      options={slackChannels}
                      placeholder={t('Select Channel')}
                      onChange={(selected) =>
                        alertsStore.edit({ slackInput: selected })
                      }
                    />
                  </div>
                </div>
              )}
              {instance.msteams && (
                <div className="flex items-start my-4">
                  <label className="w-2/6 flex-shrink-0 font-normal pt-2">
                    {t('MS Teams')}
                  </label>
                  <div className="w-4/6">
                    <DropdownChips
                      fluid
                      selected={instance.msteamsInput}
                      options={msTeamsChannels}
                      placeholder={t('Select Channel')}
                      onChange={(selected) =>
                        alertsStore.edit({ msteamsInput: selected })
                      }
                    />
                  </div>
                </div>
              )}

              {instance.email && (
                <div className="flex items-start my-4">
                  <label className="w-2/6 flex-shrink-0 font-normal pt-2">
                    {t('Email')}
                  </label>
                  <div className="w-4/6">
                    <DropdownChips
                      textFiled
                      validate={validateEmail}
                      selected={instance.emailInput}
                      placeholder={t('Type and press Enter key')}
                      onChange={(selected) =>
                        alertsStore.edit({ emailInput: selected })
                      }
                    />
                  </div>
                </div>
              )}

              {instance.webhook && (
                <div className="flex items-start my-4">
                  <label className="w-2/6 flex-shrink-0 font-normal pt-2">
                    {t('Webhook')}
                  </label>
                  <DropdownChips
                    fluid
                    selected={instance.webhookInput}
                    options={webhooks}
                    placeholder={t('Select Webhook')}
                    onChange={(selected) =>
                      alertsStore.edit({ webhookInput: selected })
                    }
                  />
                </div>
              )}
            </div>
          }
        />
      </div>

      <div className="flex items-center justify-between absolute bottom-0 left-0 right-0 p-6 border-t z-10 bg-white">
        <div className="flex items-center">
          <Button
            loading={loading}
            type="primary"
            htmlType="submit"
            disabled={loading || !instance.validate()}
            id="submit-button"
          >
            {instance.exists() ? t('Update') : t('Create')}
          </Button>
          <div className="mx-1" />
          <Button onClick={props.onClose}>{t('Cancel')}</Button>
        </div>
        <div>
          {instance.exists() && (
            <Button
              hover
              primary="text"
              loading={deleting}
              type="button"
              onClick={() => onDelete(instance)}
              id="trash-button"
            >
              <Icon name="trash" color="gray-medium" size="18" />
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}

export default observer(AlertForm);

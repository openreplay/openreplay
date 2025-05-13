import React, { useEffect } from 'react';
import { Form, SegmentSelection, confirm } from 'UI';
import { validateEmail } from 'App/validate';
import { toast } from 'react-toastify';
import { SLACK, WEBHOOK, TEAMS } from 'App/constants/schedule';
import Breadcrumb from 'Shared/Breadcrumb';
import { withSiteId, alerts } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import Alert from 'Types/alert';
import cn from 'classnames';
import WidgetName from '../WidgetName';
import BottomButtons from './AlertForm/BottomButtons';
import NotifyHooks from './AlertForm/NotifyHooks';
import AlertListItem from './AlertListItem';
import Condition from './AlertForm/Condition';
import { useTranslation } from 'react-i18next';
import { PANEL_SIZES } from 'App/constants/panelSizes'

function Circle({ text }: { text: string }) {
  return (
    <div
      style={{ left: -14, height: 26, width: 26 }}
      className="circle rounded-full bg-gray-light flex items-center justify-center absolute top-0"
    >
      {text}
    </div>
  );
}

interface ISection {
  index: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

function Section({ index, title, description, content }: ISection) {
  return (
    <div className="w-full border-l-2 last:border-l-borderColor-transparent">
      <div className="flex items-start relative">
        <Circle text={index} />
        <div className="ml-6">
          <span className="font-medium">{title}</span>
          {description && (
            <div className="text-sm color-gray-medium">{description}</div>
          )}
        </div>
      </div>

      <div className="ml-6">{content}</div>
    </div>
  );
}

interface Select {
  label: string;
  value: string | number;
}

interface IProps extends RouteComponentProps {
  siteId: string;
  slackChannels: any[];
  loading: boolean;
  deleting: boolean;
  triggerOptions: any[];
  list: any;
  onSubmit: (instance: Alert) => void;
}

function NewAlert(props: IProps) {
  const { t } = useTranslation();
  const { alertsStore, settingsStore } = useStore();
  const {
    fetchTriggerOptions,
    init,
    edit,
    save,
    remove,
    fetchList,
    instance,
    alerts: list,
    triggerOptions,
    loading,
  } = alertsStore;

  const deleting = loading;
  const { webhooks } = settingsStore;
  const { fetchWebhooks } = settingsStore;
  const { siteId } = props;

  useEffect(() => {
    init({});
    if (list.length === 0) fetchList();
    fetchTriggerOptions();
    void fetchWebhooks();
  }, []);

  useEffect(() => {
    if (list.length > 0) {
      const alertId = location.pathname.split('/').pop();
      const currentAlert = list.find(
        (alert: Alert) => alert.alertId === String(alertId),
      );
      if (currentAlert) {
        init(currentAlert);
      }
    }
  }, [list]);

  const write = ({
    target: { value, name },
  }: React.ChangeEvent<HTMLInputElement>) => edit({ [name]: value });

  const writeOption = (
    _: React.ChangeEvent,
    { name, value }: { name: string; value: Record<string, any> },
  ) => edit({ [name]: value.value });

  const onChangeCheck = ({
    target: { checked, name },
  }: React.ChangeEvent<HTMLInputElement>) => edit({ [name]: checked });

  const onDelete = async (instance: Alert) => {
    if (
      await confirm({
        header: t('Confirm'),
        confirmButton: t('Yes, delete'),
        confirmation: t('Are you sure you want to permanently delete this alert?'),
      })
    ) {
      remove(instance.alertId)
        .then(() => {
          props.history.push(withSiteId(alerts(), siteId));
          toast.success(t('Alert deleted'));
        })
        .catch(() => {
          toast.error(t('Failed to delete an alert'));
        });
    }
  };

  const onSave = (instance: Alert) => {
    const wasUpdating = instance.exists();
    save(instance)
      .then(() => {
        if (!wasUpdating) {
          toast.success(t('New alert saved'));
          props.history.push(withSiteId(alerts(), siteId));
        } else {
          toast.success(t('Alert updated'));
        }
      })
      .catch(() => {
        toast.error(t('Failed to create an alert'));
      });
  };

  const slackChannels: Select[] = [];
  const hooks: Select[] = [];
  const msTeamsChannels: Select[] = [];

  webhooks.forEach((hook) => {
    const option = { value: hook.webhookId, label: hook.name };
    if (hook.type === SLACK) {
      slackChannels.push(option);
    }
    if (hook.type === WEBHOOK) {
      hooks.push(option);
    }
    if (hook.type === TEAMS) {
      msTeamsChannels.push(option);
    }
  });

  const writeQueryOption = (
    e: React.ChangeEvent,
    { name, value }: { name: string; value: string },
  ) => {
    const { query } = instance;
    edit({ query: { ...query, [name]: value } });
  };

  const changeUnit = (value: string) => {
    alertsStore.changeUnit(value);
  };

  const writeQuery = ({
    target: { value, name },
  }: React.ChangeEvent<HTMLInputElement>) => {
    const { query } = instance;
    edit({ query: { ...query, [name]: value } });
  };

  const metric =
    instance && instance.query.left
      ? triggerOptions.find((i) => i.value === instance.query.left)
      : null;
  const unit = metric ? metric.unit : '';
  const isThreshold = instance.detectionMethod === 'threshold';

  return (
    <div style={{ maxWidth: PANEL_SIZES.maxWidth, margin: 'auto' }}>
      <Breadcrumb
        items={[
          {
            label: t('Alerts'),
            to: withSiteId('/alerts', siteId),
          },
          { label: (instance && instance.name) || t('Alert') },
        ]}
      />
      <Form
        className="relative bg-white rounded border"
        onSubmit={() => onSave(instance)}
        id="alert-form"
      >
        <div className={cn('px-6 py-4 flex justify-between items-center')}>
          <h1 className="mb-0 text-2xl mr-4 min-w-fit">
            <WidgetName
              name={instance.name}
              onUpdate={(name) =>
                write({ target: { value: name, name: 'name' } } as any)
              }
              canEdit
            />
          </h1>
          <div className="text-gray-600 w-full cursor-pointer" />
        </div>

        <div className="px-6 pb-3 flex flex-col">
          <Section
            index="1"
            title={t('Alert based on')}
            content={
              <div className="">
                <SegmentSelection
                  outline
                  name="detectionMethod"
                  className="my-3 w-1/4"
                  onSelect={(e: any, { name, value }: any) =>
                    edit({ [name]: value })
                  }
                  value={{ value: instance.detectionMethod }}
                  list={[
                    { name: t('Threshold'), value: 'threshold' },
                    { name: t('Change'), value: 'change' },
                  ]}
                />
                <div className="text-sm color-gray-medium">
                  {isThreshold &&
                    t('Eg. When Threshold is above 1ms over the past 15mins, notify me through Slack #foss-notifications.')}
                  {!isThreshold &&
                    t('Eg. Alert me if % change of memory.avg is greater than 10% over the past 4 hours compared to the previous 4 hours.')}
                </div>
                <div className="my-4" />
              </div>
            }
          />
          <Section
            index="2"
            title={t('Condition')}
            content={
              <Condition
                isThreshold={isThreshold}
                writeOption={writeOption}
                instance={instance}
                triggerOptions={triggerOptions}
                writeQueryOption={writeQueryOption}
                changeUnit={changeUnit}
                writeQuery={writeQuery}
                unit={unit}
              />
            }
          />
          <Section
            index="3"
            title={t('Notify Through')}
            description={t("You'll be noticed in app notifications. Additionally opt in to receive alerts on:")}
            content={
              <NotifyHooks
                instance={instance}
                onChangeCheck={onChangeCheck}
                slackChannels={slackChannels}
                msTeamsChannels={msTeamsChannels}
                validateEmail={validateEmail}
                hooks={hooks}
                edit={edit}
              />
            }
          />
        </div>

        <div className="flex items-center justify-between p-6 border-t">
          <BottomButtons
            loading={loading}
            instance={instance}
            deleting={deleting}
            onDelete={onDelete}
          />
        </div>
      </Form>

      <div className="bg-white mt-4 border rounded mb-10">
        {instance && (
          <AlertListItem
            alert={instance}
            triggerOptions={triggerOptions}
            demo
            siteId=""
            init={() => null}
            webhooks={webhooks}
          />
        )}
      </div>
    </div>
  );
}

export default withRouter(observer(NewAlert));

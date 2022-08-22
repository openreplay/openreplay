import React, { useEffect } from 'react';
import { Form, SegmentSelection, Icon } from 'UI';
import { connect } from 'react-redux';
import { validateEmail } from 'App/validate';
import { fetchTriggerOptions, init, edit, save, remove, fetchList } from 'Duck/alerts';
import { confirm } from 'UI';
import { toast } from 'react-toastify';
import { SLACK, WEBHOOK } from 'App/constants/schedule';
import { fetchList as fetchWebhooks } from 'Duck/webhook';
import Breadcrumb from 'Shared/Breadcrumb';
import { withSiteId, alerts } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import cn from 'classnames';
import WidgetName from '../WidgetName';
import BottomButtons from './AlertForm/BottomButtons';
import NotifyHooks from './AlertForm/NotifyHooks';
import AlertListItem from './AlertListItem';
import Condition from './AlertForm/Condition';


const Circle = ({ text }: { text: string }) => (
  <div style={{ left: -14, height: 26, width: 26 }} className="circle rounded-full bg-gray-light flex items-center justify-center absolute top-0">
    {text}
  </div>
);

interface ISection {
  index: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

const Section = ({ index, title, description, content }: ISection) => (
  <div className="w-full border-l-2 last:border-l-borderColor-transparent">
    <div className="flex items-start relative">
      <Circle text={index} />
      <div className="ml-6">
        <span className="font-medium">{title}</span>
        {description && <div className="text-sm color-gray-medium">{description}</div>}
      </div>
    </div>

    <div className="ml-6">{content}</div>
  </div>
);

interface IProps extends RouteComponentProps {
  siteId: string;
  instance: Alert;
  slackChannels: any[];
  webhooks: any[];
  loading: boolean;
  deleting: boolean;
  triggerOptions: any[];
  list: any,
  fetchTriggerOptions: () => void;
  edit: (query: any) => void;
  init: (alert?: Alert) => any;
  save: (alert: Alert) => Promise<any>;
  remove: (alertId: string) => Promise<any>;
  onSubmit: (instance: Alert) => void;
  fetchWebhooks: () => void;
  fetchList: () => void;
}

const NewAlert = (props: IProps) => {
  const {
    instance,
    siteId,
    webhooks,
    loading,
    deleting,
    triggerOptions,
    init,
    edit,
    save,
    remove,
    fetchWebhooks,
    fetchList,
    list,
  } = props;

  useEffect(() => {
    if (list.size === 0) fetchList();
    props.fetchTriggerOptions();
    fetchWebhooks();
  }, []);

  useEffect(() => {
    if (list.size > 0) {
      const alertId = location.pathname.split('/').pop()
      const currentAlert = list.toJS().find((alert: Alert) => alert.alertId === parseInt(alertId, 10));
      init(currentAlert);
    }
  }, [list])


  const write = ({ target: { value, name } }: React.ChangeEvent<HTMLInputElement>) =>
    props.edit({ [name]: value });
  const writeOption = (
    _: React.ChangeEvent,
    { name, value }: { name: string; value: Record<string, any> }
  ) => props.edit({ [name]: value.value });
  const onChangeCheck = ({ target: { checked, name } }: React.ChangeEvent<HTMLInputElement>) =>
    props.edit({ [name]: checked });

  const onDelete = async (instance: Alert) => {
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this alert?`,
      })
    ) {
      remove(instance.alertId).then(() => {
        props.history.push(withSiteId(alerts(), siteId))
      });
    }
  };
  const onSave = (instance: Alert) => {
    const wasUpdating = instance.exists();
    save(instance).then(() => {
      if (!wasUpdating) {
        toast.success('New alert saved');
        props.history.push(withSiteId(alerts(), siteId))
      } else {
        toast.success('Alert updated');
      }
    });
  };

  const onClose = () => {
    props.history.push(withSiteId(alerts(), siteId))
  }

  const slackChannels = webhooks
    .filter((hook) => hook.type === SLACK)
    .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
    // @ts-ignore
    .toJS();
  const hooks = webhooks
    .filter((hook) => hook.type === WEBHOOK)
    .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
    // @ts-ignore
    .toJS();

  

  const writeQueryOption = (
    e: React.ChangeEvent,
    { name, value }: { name: string; value: string }
  ) => {
    const { query } = instance;
    props.edit({ query: { ...query, [name]: value } });
  };

  const writeQuery = ({ target: { value, name } }: React.ChangeEvent<HTMLInputElement>) => {
    const { query } = instance;
    props.edit({ query: { ...query, [name]: value } });
  };

  const metric =
    instance && instance.query.left
      ? triggerOptions.find((i) => i.value === instance.query.left)
      : null;
  const unit = metric ? metric.unit : '';
  const isThreshold = instance.detectionMethod === 'threshold';

  return (
    <>
      <Breadcrumb
        items={[
          {
            label: 'Alerts',
            to: withSiteId('/alerts', siteId),
          },
          { label: (instance && instance.name) || 'Alert' },
        ]}
      />
      <Form
        className="relative bg-white rounded border"
        onSubmit={() => onSave(instance)}
        id="alert-form"
      >
        <div
          className={cn('px-6 py-4 flex justify-between items-center',
          )}
        >
          <h1 className="mb-0 text-2xl mr-4 min-w-fit">
            <WidgetName name={instance.name} onUpdate={(name) => write({ target: { value: name, name: 'name' }} as any)} canEdit />
          </h1>
          <div
            className="text-gray-600 w-full cursor-pointer"
          >
          </div>
        </div>
        
            <div className="px-6 pb-3 flex flex-col">
              <Section
                index="1"
                title={'Alert based on'}
                content={
                  <div className="">
                    <SegmentSelection
                      outline
                      name="detectionMethod"
                      className="my-3 w-1/4"
                      onSelect={(e: any, { name, value }: any) => props.edit({ [name]: value })}
                      value={{ value: instance.detectionMethod }}
                      list={[
                        { name: 'Threshold', value: 'threshold' },
                        { name: 'Change', value: 'change' },
                      ]}
                    />
                    <div className="text-sm color-gray-medium">
                      {isThreshold &&
                        'Eg. When Threshold is above 1ms over the past 15mins, notify me through Slack #foss-notifications.'}
                      {!isThreshold &&
                        'Eg. Alert me if % change of memory.avg is greater than 10% over the past 4 hours compared to the previous 4 hours.'}
                    </div>
                    <div className="my-4" />
                  </div>
                }
              />
              <Section
                index="2"
                title="Condition"
                content={
                  <Condition
                    isThreshold={isThreshold}
                    writeOption={writeOption}
                    instance={instance}
                    triggerOptions={triggerOptions}
                    writeQueryOption={writeQueryOption}
                    writeQuery={writeQuery}
                    unit={unit}
                  />
                }
              />
              <Section
                index="3"
                title="Notify Through"
                description="You'll be noticed in app notifications. Additionally opt in to receive alerts on:"
                content={
                  <NotifyHooks 
                    instance={instance}
                    onChangeCheck={onChangeCheck}
                    slackChannels={slackChannels}
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
          <AlertListItem alert={instance} demo siteId="" init={() => null} webhooks={webhooks} />
        )}
      </div>
    </>
  );
};

export default withRouter(connect(
  (state) => ({
    // @ts-ignore
    instance: state.getIn(['alerts', 'instance']),
    //@ts-ignore
    list: state.getIn(['alerts', 'list']),
    // @ts-ignore
    triggerOptions: state.getIn(['alerts', 'triggerOptions']),
    // @ts-ignore
    loading: state.getIn(['alerts', 'saveRequest', 'loading']),
    // @ts-ignore
    deleting: state.getIn(['alerts', 'removeRequest', 'loading']),
    // @ts-ignore
    webhooks: state.getIn(['webhooks', 'list']),
  }),
  { fetchTriggerOptions, init, edit, save, remove, fetchWebhooks, fetchList }
  // @ts-ignore
)(NewAlert));

import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { toast } from '@/ui/overlays/toast';
import Alert from 'Types/alert';
import { Bell, MoreHorizontal, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { alerts, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

import AlertFields from './AlertFields';
import { alertSentence } from './alertSentence';

function NewAlert({ siteId }: { siteId: string }) {
  const { t } = useTranslation();
  const { alertsStore, settingsStore } = useStore();
  const {
    fetchTriggerOptions,
    init,
    save,
    fetchList,
    instance,
    alerts: list,
    triggerOptions,
    loading,
  } = alertsStore;

  const history = useHistory();
  const [deleting, setDeleting] = React.useState(false);
  // an edit link whose alert could not be loaded: never a blank create form
  const [loadFailed, setLoadFailed] = React.useState(false);
  const mounted = React.useRef(true);
  const alertId = location.pathname.split('/').pop();
  const loadList = (force = false) => {
    setLoadFailed(false);
    const listed =
      force || list.length === 0 ? fetchList() : Promise.resolve(true);
    // an id the list doesn't know leads back to the list
    void listed.then((ok) => {
      if (!mounted.current || alertId === 'create') return;
      if (!ok) setLoadFailed(true);
      else if (
        !alertsStore.alerts.some((a: Alert) => a.alertId === String(alertId))
      )
        history.replace(withSiteId(alerts(), siteId));
    });
  };
  const { webhooks } = settingsStore;
  const { fetchWebhooks } = settingsStore;

  useEffect(() => {
    init({});
    mounted.current = true;
    loadList();
    fetchTriggerOptions();
    void fetchWebhooks();
    return () => {
      mounted.current = false;
    };
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

  const remove = () => {
    setDeleting(false);
    alertsStore
      .remove(instance.alertId)
      .then(() => {
        history.push(withSiteId(alerts(), siteId));
        toast.success(t('Alert deleted'));
      })
      .catch(() => toast.error(t('Failed to delete an alert')));
  };

  const onSave = () => {
    const wasUpdating = instance.exists();
    save(instance)
      .then(() => {
        if (!wasUpdating) {
          toast.success(t('New alert saved'));
          history.push(withSiteId(alerts(), siteId));
        } else {
          toast.success(t('Alert updated'));
        }
      })
      .catch(() =>
        toast.error(
          wasUpdating
            ? t('Failed to update the alert')
            : t('Failed to create an alert'),
        ),
      );
  };

  if (loadFailed)
    return (
      <PageCard
        back={{
          label: t('Alerts'),
          onClick: () => history.push(withSiteId(alerts(), siteId)),
        }}
        title={t('Alert')}
      >
        <EmptyState
          title={t('Could not load this alert')}
          hint={t('Check your connection and try again.')}
          action={
            <Button loading={loading} onClick={() => loadList(true)}>
              {t('Try again')}
            </Button>
          }
        />
      </PageCard>
    );

  const exists = instance.exists();
  const trigger = triggerOptions.find(
    (o: any) => o.value === instance.query.left,
  )?.label;

  return (
    <PageCard
      back={{
        label: t('Alerts'),
        onClick: () => history.push(withSiteId(alerts(), siteId)),
      }}
      title={instance.name || t('New alert')}
      actions={
        exists ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <IconButton
                  icon={<MoreHorizontal size={15} />}
                  label={t('More')}
                  variant="ghost"
                />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={[
                  {
                    key: 'delete',
                    icon: <Trash2 size={13} />,
                    label: t('Delete'),
                    danger: true,
                    onClick: () => setDeleting(true),
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      split
    >
      <PagePanel>
        <div className="m-alertf__page">
          <AlertFields triggerOptions={triggerOptions} withName />
          <footer className="m-alertf__foot">
            <Button
              variant="primary"
              disabled={loading || !instance.validate()}
              onClick={onSave}
            >
              {exists ? t('Update') : t('Create')}
            </Button>
            {exists ? (
              <Button
                variant="danger-outline"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={13} />
                {t('Delete')}
              </Button>
            ) : null}
          </footer>
        </div>
      </PagePanel>
      <PagePanel
        head={
          <span className="m-pa__head-title">
            {t('As it will appear in the list')}
          </span>
        }
      >
        <div className="m-alertf__preview">
          <span className="m-alertf__bell">
            <Bell size={14} aria-hidden="true" />
          </span>
          <div className="m-pa__name-cell">
            <span className="m-truncate">
              {instance.name || t('Untitled alert')}
            </span>
            <span className="m-pa__rule">
              {alertSentence(instance, webhooks, trigger)}
            </span>
          </div>
          <Chip kind="tag">
            {instance.detectionMethod === 'change'
              ? t('Change')
              : t('Threshold')}
          </Chip>
        </div>
      </PagePanel>
      <ConfirmDialog
        open={deleting}
        title={t('Delete this alert?')}
        okText={t('Yes, delete')}
        danger
        onCancel={() => setDeleting(false)}
        onOk={remove}
      >
        {t('{{name}} stops watching and is permanently deleted.', {
          name: instance.name,
        })}
      </ConfirmDialog>
    </PageCard>
  );
}

export default observer(NewAlert);

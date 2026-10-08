import { Button } from '@/ui/actions/button';
import { DrawerFooter } from '@/ui/overlays/EntityDrawer';
import { Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import AlertFields from 'Components/Dashboard/components/Alerts/AlertFields';

interface Props {
  showModal?: boolean;
  metricId?: number;
  onClose?: () => void;
}

/** Alert on the card being viewed: its series are the metrics on offer. */
function AlertFormModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { alertsStore, settingsStore, metricStore } = useStore();
  const { instance, loading, triggerOptions: all } = alertsStore;

  useEffect(() => {
    void settingsStore.fetchWebhooks();
    void alertsStore.fetchTriggerOptions();
  }, []);

  const series = metricStore.instance.series;
  const triggerOptions =
    series.length > 0
      ? all
          .filter((o: any) => series.some((s: any) => s.seriesId === o.value))
          .map((o: any) => ({
            ...o,
            label: o.label.split('.').slice(1).join('.'),
          }))
      : all;

  const save = () => alertsStore.save(instance).then(() => onClose?.());
  const remove = () =>
    alertsStore.remove(instance.alertId).then(() => onClose?.());

  return (
    <div className="flex h-full flex-col">
      <div className="m-alertf__drawer flex-1 overflow-y-auto">
        <AlertFields triggerOptions={triggerOptions} withName />
      </div>
      <DrawerFooter
        left={
          instance.exists() ? (
            <Button variant="danger-outline" onClick={() => void remove()}>
              <Trash2 size={13} />
              {t('Delete')}
            </Button>
          ) : null
        }
        right={
          <>
            <Button variant="subtle" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={loading || !instance.validate()}
              onClick={() => void save()}
            >
              {instance.exists() ? t('Update') : t('Create')}
            </Button>
          </>
        }
      />
    </div>
  );
}

export default observer(AlertFormModal);

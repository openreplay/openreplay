import { Button } from '@/ui/actions/button';
import { useToast } from '@/ui/overlays/toast';
import { Play } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import DataItemPage from '../DataItemPage';
import DistinctEventPropsList from './DistinctEventPropsList';
import type { DistinctEvent } from './api';
import { updateEventProperty } from './api';

function DistinctEventPage({
  event,
  onBack,
  openSessions,
  refetchList,
}: {
  event: DistinctEvent;
  onBack: () => void;
  openSessions: () => void;
  refetchList: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();

  const save = async (patch: Partial<DistinctEvent>) => {
    try {
      await updateEventProperty({ ...event, ...patch });
      refetchList();
      toast.success(t('Event updated'));
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to update event'));
    }
  };

  return (
    <DataItemPage
      back={{ label: t('Events'), onClick: onBack }}
      title={event.displayName || event.name}
      name={event.name}
      actions={
        <Button onClick={openSessions}>
          <Play size={13} />
          {t('Play sessions')}
        </Button>
      }
      rows={[
        {
          label: t('Display name'),
          value: event.displayName,
          onSave: (v) => void save({ displayName: v }),
        },
        {
          label: t('Description'),
          value: event.description,
          multiline: true,
          placeholder: t('What this event means'),
          onSave: (v) => void save({ description: v }),
        },
        {
          label: t('30-day volume'),
          value: String(event.count),
          display: (
            <span className="m-dmg__mono">{event.count.toLocaleString()}</span>
          ),
        },
        {
          label: t('Kind'),
          value: event.autoCaptured ? t('Autocaptured') : t('Custom'),
          hint: event.autoCaptured
            ? t('Sent by the tracker on its own')
            : t('Sent by your code'),
        },
      ]}
      status={{
        hidden: event.status === 'hidden',
        onChange: (hidden) =>
          void save({ status: hidden ? 'hidden' : 'visible' }),
      }}
      footer={<DistinctEventPropsList eventName={event.name} />}
    />
  );
}

export default DistinctEventPage;

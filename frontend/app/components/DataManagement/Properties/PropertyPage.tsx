import { useToast } from '@/ui/overlays/toast';
import React from 'react';
import { useTranslation } from 'react-i18next';

import DataItemPage from '../DataItemPage';
import EventsWithProp from './EventsWithProp';
import UsersWithProp from './UsersWithProp';
import { type DistinctProperty, updateProperty } from './api';

function PropertyPage({
  source,
  property: p,
  back,
  refetchList,
}: {
  source: 'users' | 'events';
  property: DistinctProperty;
  back: { label: string; onClick: () => void };
  refetchList: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const isUser = source === 'users';
  const volume = (isUser ? p.usersCount : p.count) ?? 0;

  const save = async (patch: Partial<DistinctProperty>) => {
    try {
      await updateProperty({ ...p, ...patch, source });
      toast.success(t('Property updated'));
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to update property'));
    } finally {
      refetchList();
    }
  };

  return (
    <DataItemPage
      back={back}
      title={p.displayName || p.name}
      name={p.name}
      rows={[
        {
          label: t('Display name'),
          value: p.displayName,
          onSave: (v) => void save({ displayName: v }),
        },
        {
          label: t('Description'),
          value: p.description,
          multiline: true,
          placeholder: t('What this property holds'),
          onSave: (v) => void save({ description: v }),
        },
        {
          label: isUser
            ? t('Users with this property')
            : t('Events with this property'),
          value: String(volume),
          display: (
            <span className="m-dmg__mono">{volume.toLocaleString()}</span>
          ),
          hint: isUser ? undefined : t('in the last 30 days'),
        },
        {
          label: t('Type'),
          value: p.dataType,
          display: <span className="m-dmg__mono">{p.dataType}</span>,
        },
      ]}
      status={{
        hidden: p.status === 'hidden',
        onChange: (hidden) =>
          void save({ status: hidden ? 'hidden' : 'visible' }),
      }}
      footer={
        isUser ? (
          <UsersWithProp propName={p.name} />
        ) : (
          <EventsWithProp propName={p.name} />
        )
      }
    />
  );
}

export default PropertyPage;

import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { NoContent } from 'UI';

import DocLink from 'Shared/DocLink/DocLink';
import { useTranslation } from 'react-i18next';

function TeamsChannelList(props: { onEdit: () => void }) {
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const { list } = integrationsStore.msteams;
  const { edit } = integrationsStore.msteams;

  const onEdit = (instance: Record<string, any>) => {
    edit(instance);
    props.onEdit();
  };

  return (
    <div className="mt-6">
      <NoContent
        title={
          <div className="p-5 mb-4">
            <div className="text-base text-left">
              {t('Integrate MS Teams with OpenReplay and share insights with the rest of the team, directly from the recording page.')}
            </div>
            <DocLink
              className="mt-4 text-base"
              label={t('Integrate MS Teams')}
              url="https://docs.openreplay.com/integrations/msteams"
            />
          </div>
        }
        size="small"
        show={list.length === 0}
      >
        {list.map((c: any) => (
          <div
            key={c.webhookId}
            className="border-t px-5 py-2 flex items-center justify-between cursor-pointer hover:bg-active-blue"
            onClick={() => onEdit(c)}
          >
            <div className="flex-grow-0" style={{ maxWidth: '90%' }}>
              <div>{c.name}</div>
              <div className="truncate test-xs color-gray-medium">
                {c.endpoint}
              </div>
            </div>
          </div>
        ))}
      </NoContent>
    </div>
  );
}

export default observer(TeamsChannelList);

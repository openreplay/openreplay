import React from 'react';
import { NoContent } from 'UI';
import DocLink from 'Shared/DocLink/DocLink';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

function SlackChannelList(props) {
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const { list } = integrationsStore.slack;
  const { edit } = integrationsStore.slack;

  const onEdit = (instance) => {
    edit(instance.toData());
    props.onEdit();
  };

  return (
    <div className="mt-6">
      <NoContent
        title={
          <div className="p-5 mb-4">
            <div className="text-base text-left">
              {t('Integrate Slack with OpenReplay and share insights with the rest of the team, directly from the recording page.')}
            </div>
            <DocLink
              className="mt-4 text-base"
              label={t('Integrate Slack')}
              url="https://docs.openreplay.com/integrations/slack"
            />
          </div>
        }
        size="small"
        show={list.length === 0}
      >
        {list.map((c) => (
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

export default observer(SlackChannelList);

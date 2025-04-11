import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import MetadataItem from './MetadataItem';
import { useTranslation } from 'react-i18next';

function Metadata() {
  const { t } = useTranslation();
  const { sessionStore } = useStore();
  const { metadata } = sessionStore.current;

  const metaLength = Object.keys(metadata).length;
  if (metaLength === 0) {
    return (
      <span className="text-sm color-gray-medium">
        {t('Check')}{' '}
        <a
          href="https://docs.openreplay.com/en/session-replay/metadata"
          target="_blank"
          className="link"
        >
          {t('how to use Metadata')}
        </a>{' '}
        {t('if you haven’t yet done so.')}
      </span>
    );
  }
  return (
    <div>
      {Object.keys(metadata).map((key) => {
        const value = metadata[key];
        return <MetadataItem item={{ value, key }} key={key} />;
      })}
    </div>
  );
}

export default observer(Metadata);

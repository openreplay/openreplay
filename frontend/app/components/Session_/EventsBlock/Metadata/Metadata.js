import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import MetadataItem from './MetadataItem';
import { useTranslation } from 'react-i18next';

function Metadata() {
  const { sessionStore } = useStore();
  const { metadata } = sessionStore.current;
  const { t } = useTranslation();

  const metaLength = Object.keys(metadata).length;
  if (metaLength === 0) {
    return (
      <span className="text-sm color-gray-medium">
        {t('Check')}
        <a
          href="https://docs.openreplay.com/installation/metadata"
          target="_blank"
          className="link"
          rel="noreferrer"
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

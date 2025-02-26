import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import MetadataItem from './MetadataItem';

function Metadata() {
  const { sessionStore } = useStore();
  const { metadata } = sessionStore.current;

  const metaLength = Object.keys(metadata).length;
  if (metaLength === 0) {
    return (
      (
        <span className="text-sm color-gray-medium">
          Check
          <a href="https://docs.openreplay.com/installation/metadata" target="_blank" className="link" rel="noreferrer">how to use Metadata</a>
          {' '}
          if you haven’t yet done so.
        </span>
      )
    );
  }
  return (
    <div>
      { Object.keys(metadata).map((key) => {
        const value = metadata[key];
        return <MetadataItem item={{ value, key }} key={key} />;
      }) }
    </div>
  );
}

export default observer(Metadata);

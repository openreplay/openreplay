import React from 'react';
import MetadataItem from './MetadataItem';
import { useStore } from "App/mstore";
import { observer } from 'mobx-react-lite';

function Metadata () {
  const { sessionStore } = useStore();
  const metadata = sessionStore.current.metadata;

  const metaLength = Object.keys(metadata).length;
  if (metaLength === 0) {
    return (
      (<span className="text-sm color-gray-medium">Check <a href="https://docs.openreplay.com/en/session-replay/metadata" target="_blank" className="link">how to use Metadata</a> if you haven’t yet done so.</span>)
    )
  }
  return (
    <div>
      { Object.keys(metadata).map((key) => {
        const value = metadata[key]
        return <MetadataItem item={ { value, key } } key={ key } />
      }) }
    </div>
  );
}

export default observer(Metadata)
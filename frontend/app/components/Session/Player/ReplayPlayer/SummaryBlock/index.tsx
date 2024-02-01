import { SessionFilesInfo } from 'Player';
import React from 'react';
import Icon from 'UI/Icon';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function SummaryBlock({ session }: { session: SessionFilesInfo }) {
  const { aiSummaryStore } = useStore();

  React.useEffect(() => {
    void aiSummaryStore.getSummary(session.sessionId);
  }, []);
  return (
    <div style={summaryBlockStyle}>
      <div className={'flex items-center gap-2'}>
        <Icon name={'sparkles'} size={16} />
        <div className={'font-semibold text-xl'}>AI Summary</div>
      </div>

      {aiSummaryStore.text
       ? <div className={'border border-gray-light rounded p-4 bg-white whitespace-pre-wrap'}>
         {aiSummaryStore.text}
      </div>
       : <TextPlaceholder />}
    </div>
  );
}

function TextPlaceholder() {
  return (
    <div
      className={
        'animate-pulse border border-gray-light rounded p-4 bg-white whitespace-pre-wrap flex flex-col gap-2'
      }
    >
      <div className={'h-2 bg-gray-medium rounded'} />
      <div className={'h-2 bg-gray-medium rounded'} />

      <div className={'grid grid-cols-3 gap-2'}>
        <div className={'h-2 bg-gray-medium rounded col-span-2'} />
        <div className={'h-2 bg-gray-medium rounded col-span-1'} />
      </div>

      <div className={'grid grid-cols-4 gap-2 mt-3'}>
        <div className={'h-2 bg-gray-medium rounded col-span-1'} />
        <div className={'h-2 bg-gray-medium rounded col-span-1'} />
        <div className={'h-2 bg-gray-medium rounded col-span-2'} />
      </div>
      <div className={'grid grid-cols-4 gap-2'}>
        <div className={'h-2 bg-gray-medium rounded col-span-2'} />
        <div className={'h-2 bg-gray-medium rounded col-span-2'} />
      </div>
    </div>
  );
}

const summaryBlockStyle: React.CSSProperties = {
  background: 'linear-gradient(156deg, #E3E6FF 0%, #E4F3F4 69.48%)',
  width: '100%',
  height: '100%',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
};

export default observer(SummaryBlock);

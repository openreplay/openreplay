import React from 'react';
import Icon from 'UI/Icon';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const userBehaviorRegex = /User\s+(\w+\s+)?Behavior/i;
const issuesErrorsRegex = /Issues\s+(and\s+|,?\s+)?(\w+\s+)?Errors/i;

function testLine(line: string): boolean {
  return userBehaviorRegex.test(line) || issuesErrorsRegex.test(line);
}

function SummaryBlock({ sessionId }: { sessionId: string }) {
  const { aiSummaryStore } = useStore();

  React.useEffect(() => {
    void aiSummaryStore.getSummary(sessionId);
  }, []);

  const formattedText = aiSummaryStore.text.split('\n').map((line) => {
    if (testLine(line)) {
      return <div className={'font-semibold mt-2'}>{line}</div>;
    }
    if (line.startsWith('*')) {
      return <li className={'ml-1 marker:mr-1'}>{line.replace('* ', '')}</li>;
    }
    return <div>{line}</div>;
  });

  return (
    <div style={summaryBlockStyle}>
      <div className={'flex items-center gap-2'}>
        <Icon name={'sparkles'} size={18} />
        <div className={'font-semibold text-xl'}>AI Summary</div>
      </div>

      {aiSummaryStore.text ? (
        <div className={'rounded p-4 bg-white whitespace-pre-wrap flex flex-col'}>
          <div>
            Here’s the AI breakdown of the session, covering user behavior and technical insights.
          </div>
          <>{formattedText.map((v) => v)}</>
        </div>
      ) : (
        <TextPlaceholder />
      )}
    </div>
  );
}

function TextPlaceholder() {
  return (
    <div className={'animate-pulse rounded p-4 bg-white whitespace-pre-wrap flex flex-col gap-2'}>
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
        <div className={'h-2 bg-transparent rounded col-span-2'} />
      </div>
    </div>
  );
}

const summaryBlockStyle: React.CSSProperties = {
  background: 'linear-gradient(156deg, #E3E6FF 0%, #E4F3F4 69.48%)',
  width: '100%',
  height: '100vh',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
};

export default observer(SummaryBlock);

import React from 'react';
import ChatInput from './ChatInput';
import Ideas from './Ideas';

function IntroSection({ onAsk, projectId }: { onAsk: (query: string) => void, projectId: string }) {
  const isLoading = false;
  return (
    <>
      <div className={'relative w-2/3'}>
        <div className="font-semibold text-lg">
          Hey userName, how can I help you?
        </div>
        <ChatInput isLoading={isLoading} onSubmit={onAsk} isArea />
        <div className={'absolute top-full flex flex-col gap-2 mt-4'}>
          <Ideas onClick={(query) => onAsk(query)} projectId={projectId} />
        </div>
      </div>
      <div className={'text-disabled-text absolute bottom-4'}>
        OpenReplay AI can make mistakes. Verify its outputs.
      </div>
    </>
  );
}

export default IntroSection;

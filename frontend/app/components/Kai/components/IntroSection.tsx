import React from 'react';
import ChatInput from './ChatInput';
import Ideas from './Ideas';

function IntroSection({ onAsk }: { onAsk: (query: string) => void }) {
  const isLoading = false;
  return (
    <>
      <div className={'text-disabled-text text-xl absolute top-4'}>
        Kai is your AI assistant, delivering smart insights in response to your
        queries.
      </div>
      <div className={'relative w-2/3'} style={{ height: 44 }}>
        {/*<GradientBorderInput placeholder={'Ask anything about your product and users...'} onButtonClick={() => null} />*/}
        <ChatInput isLoading={isLoading} onSubmit={onAsk} />
        <div className={'absolute top-full flex flex-col gap-2 mt-4'}>
          <Ideas onClick={(query) => onAsk(query)} />
        </div>
      </div>
      <div className={'text-disabled-text absolute bottom-4'}>
        OpenReplay AI can make mistakes. Verify its outputs.
      </div>
    </>
  );
}

export default IntroSection;

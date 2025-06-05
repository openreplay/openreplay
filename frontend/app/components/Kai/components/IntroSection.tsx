import React from 'react';
import ChatInput from './ChatInput';
import Ideas from './Ideas';
import { useTranslation } from 'react-i18next';

function IntroSection({
  onAsk,
  onCancel,
  userName,
  projectId,
  limited,
}: {
  onAsk: (query: string) => void;
  projectId: string;
  onCancel: () => void;
  userName: string;
  limited?: boolean;
}) {
  const { t } = useTranslation();
  const isLoading = false;
  return (
    <>
      <div className={'relative w-2/3 flex flex-col gap-4'}>
        <div className="font-semibold text-lg">
          {`${t('Hey')} ${userName}, ${t('how can I help you?')}`}
        </div>
        <ChatInput
          onCancel={onCancel}
          isLoading={isLoading}
          onSubmit={onAsk}
          isArea
        />
        <div className={'absolute top-full flex flex-col gap-2 mt-4'}>
          <Ideas limited={limited} onClick={(query) => onAsk(query)} projectId={projectId} />
        </div>
      </div>
    </>
  );
}

export default IntroSection;

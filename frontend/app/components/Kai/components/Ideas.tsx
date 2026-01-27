import React from 'react';
import cn from 'classnames';
import { useQuery } from '@tanstack/react-query';
import { kaiService } from 'App/services';
import { useTranslation } from 'react-i18next';

function Ideas({
  onClick,
  projectId,
  threadId = null,
  messageId = null,
  inChat,
  limited,
}: {
  onClick: (query: string) => void;
  projectId: string;
  threadId?: string | null;
  messageId: string | null;
  inChat?: boolean;
  limited?: boolean;
}) {
  const { t } = useTranslation();
  const { data, isPending } = useQuery({
    queryKey: [
      'kai',
      projectId,
      'chats',
      threadId,
      'prompt-suggestions',
      messageId,
    ],
    queryFn: () => kaiService.getPromptSuggestions(projectId, threadId),
    staleTime: 1000 * 60,
  });
  const suggestedPromptIdeas = data || [];
  const ideas = React.useMemo(() => {
    const defaultPromptIdeas = [
      t('Top user journeys'),
      t('Where do users drop off'),
      t('Failed network requests today'),
    ];
    const result = suggestedPromptIdeas;
    const targetSize = 3;
    while (result.length < targetSize && defaultPromptIdeas.length) {
      const next = defaultPromptIdeas.pop();
      if (next) {
        result.push(next);
      }
    }
    return result;
  }, [suggestedPromptIdeas.length]);
  return (
    <div>
      <div className={'flex items-center gap-2 mb-1 text-gray-dark'}>
        <b>
          {inChat ? t('Suggested Follow-up Questions') : t('Suggested Ideas:')}
        </b>
      </div>
      {isPending ? (
        <div className="animate-pulse text-disabled-text">
          {t('Generating ideas')}...
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {ideas.map((title) => (
            <IdeaItem
              limited={limited}
              key={title}
              onClick={onClick}
              title={title}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaItem({
  title,
  onClick,
  limited,
}: {
  title: string;
  onClick: (query: string) => void;
  limited?: boolean;
}) {
  return (
    <div
      onClick={() => (limited ? null : onClick(title))}
      className={cn(
        'cursor-pointer text-gray-dark hover:text-black rounded-full px-4 py-2 shadow-sm border',
        limited ? 'bg-gray-lightest cursor-not-allowed' : 'bg-white',
      )}
    >
      {title}
    </div>
  );
}

export default Ideas;

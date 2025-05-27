import React from 'react';
import { Lightbulb, MoveRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { kaiService } from 'App/services';
import { useTranslation } from 'react-i18next';

function Ideas({
  onClick,
  projectId,
  threadId = null,
}: {
  onClick: (query: string) => void;
  projectId: string,
  threadId?: string | null;
}) {
  const { t } = useTranslation();
  const {
      data: suggestedPromptIdeas = [],
      isPending,
  } = useQuery({
      queryKey: ['kai', projectId, 'chats', threadId, 'prompt-suggestions'],
      queryFn: () => kaiService.getPromptSuggestions(projectId, threadId),
      staleTime: 1000 * 60,
  });
  const ideas = React.useMemo(() => {
    const defaultPromptIdeas = [
      'Top user journeys',
      'Where do users drop off',
      'Failed network requests today',
    ];
    const result = suggestedPromptIdeas;
    const targetSize = 3;
    while (result.length < targetSize && defaultPromptIdeas.length) {
      result.push(defaultPromptIdeas.pop());
    }
    return result;
  }, [suggestedPromptIdeas.length]);
  return (
    <>
      <div className={'flex items-center gap-2 mb-1 text-gray-dark'}>
        <b>Suggested Ideas:</b>
      </div>
      {isPending ? (
        <div className="animate-pulse text-disabled-text">
          {t('Generating ideas')}...
        </div>
      ) : (
        <div className="flex gap-4 flex-wrap">
          {ideas.map((title) => (
            <IdeaItem key={title} onClick={onClick} title={title} />
          ))}
        </div>
      )}
    </>
  );
}

function IdeaItem({
  title,
  onClick,
}: {
  title: string;
  onClick: (query: string) => void;
}) {
  return (
    <div
      onClick={() => onClick(title)}
      className={
        'cursor-pointer text-gray-dark hover:text-black rounded-full px-4 py-2 shadow border'
      }
    >
      {title}
    </div>
  );
}

export default Ideas;

import React from 'react';
import { Lightbulb, MoveRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { kaiService } from 'App/services';
import { useTranslation } from 'react-i18next';

function Ideas({ onClick, projectId }: { onClick: (query: string) => void, projectId: string }) {
  const { t } = useTranslation();
    const {
        data: suggestedPromptIdeas = [],
        isPending,
    } = useQuery({
        queryKey: ['kai', 'prompt-suggestions', projectId],
        queryFn: () => kaiService.getPromptSuggestions(projectId),
        staleTime: 1000 * 60,
    });
    const defaultPromptIdeas = [
        'Top user journeys',
        'Where do users drop off',
        'Failed network requests today',
    ];
    const maxPromptIdeas = defaultPromptIdeas.length;
    const promptIdeas = [
        ...suggestedPromptIdeas,
        ...defaultPromptIdeas,
    ].slice(0, maxPromptIdeas);
  return (
    <>
      <div className={'flex items-center gap-2 mb-1 text-gray-dark'}>
        <Lightbulb size={16} />
        <b>Ideas:</b>
      </div>
      {
          isPending ?
              (<div className="animate-pulse text-disabled-text">{t('Generating ideas')}...</div>) :
              (<div>{promptIdeas.map(title => (<IdeaItem key={title} onClick={onClick} title={title} />))}</div>)
      }
    </>
  );
}

function IdeaItem({ title, onClick }: { title: string, onClick: (query: string) => void }) {
  return (
    <div
      onClick={() => onClick(title)}
      className={
        'flex items-center gap-2 cursor-pointer text-gray-dark hover:text-black'
      }
    >
      <MoveRight size={16} />
      <span>{title}</span>
    </div>
  );
}

export default Ideas;

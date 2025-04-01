import React from 'react';
import { Lightbulb, MoveRight } from 'lucide-react';

function Ideas({ onClick }: { onClick: (query: string) => void }) {
  return (
    <>
      <div className={'flex items-center gap-2 mb-1 text-gray-dark'}>
        <Lightbulb size={16} />
        <b>Ideas:</b>
      </div>
      <IdeaItem onClick={onClick} title={'Top user journeys'} />
      <IdeaItem onClick={onClick} title={'Where do users drop off'} />
      <IdeaItem onClick={onClick} title={'Failed network requests today'} />
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

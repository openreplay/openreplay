import React from 'react';
import { Icon } from 'UI';
import DocLink from 'Shared/DocLink';

interface Props {
  title: string;
  icon: string;
  description: string;
}

function IntegrationModalCard(props: Props) {
  const { title, icon, description } = props;
  return (
    <div className='flex items-start p-5 gap-4'>
      <div className='border rounded-lg p-2 shrink-0'>
        <img className='h-20 w-20' src={'/assets/' + icon + '.svg'} alt='integration' />
      </div>
      <div>
        <h3 className='text-2xl'>{title}</h3>
        <div>{description}</div>
      </div>
    </div>
  );
}

export default IntegrationModalCard;
import React from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Icon } from 'UI';

interface Props {
  data: any;
}

function RecordingStatus(props: Props) {
  const { data } = props;


  return (
    <div className='flex items-center gap-8 justify-center m-20'>
      <AnimatedSVG name={ICONS.PROCESSING} size={180} />
      <div className='flex flex-col gap-4 w-3/6'>
        <div className='text-lg font-medium'>Processing your first session.</div>
        <div className='flex items-start'>
          <div className='mr-2'>
            <Icon name='check-circle-fill' size={20} color='tealx' />
          </div>
          <div>Your tracker seems to be correctly setup!</div>
        </div>
        <div className='flex items-start'>
          <div className='mr-2'>
            <Icon name='check-circle' size={20} color='tealx' />
          </div>
          <div>
            {data.count} ongoing session{data.count !== 1 && 's'}.
            <br />Completed sessions will appear here within a few minutes.
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordingStatus;
import React from 'react';
import cn from 'classnames';
import { IconButton } from 'UI';
import stl from './errorItem.module.css';
import { Duration } from 'luxon';
import { useModal } from 'App/components/Modal';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';

function ErrorItem({ error = {}, onJump, inactive, selected }) {
  const { showModal } = useModal();

  const onErrorClick = () => {
    showModal(<ErrorDetailsModal errorId={error.errorId} />, { right: true });
  }
  return (
    <div
      className={cn(stl.wrapper, 'py-2 px-4 flex cursor-pointer', {
        [stl.inactive]: inactive,
        [stl.selected]: selected,
      })}
      onClick={onJump}
    >
      <div className={'self-start pr-4 color-red'}>
        {Duration.fromMillis(error.time).toFormat('mm:ss.SSS')}
      </div>
      <div className="mr-auto overflow-hidden">
        <div className="color-red mb-1 cursor-pointer code-font">
          {error.name}
          <span className="color-gray-darkest ml-2">{error.stack0InfoString}</span>
        </div>
        <div className="text-sm color-gray-medium">{error.message}</div>
      </div>
      <div className="self-center">
        <IconButton red onClick={onErrorClick} label="DETAILS" />
      </div>
    </div>
  );
}

export default ErrorItem;

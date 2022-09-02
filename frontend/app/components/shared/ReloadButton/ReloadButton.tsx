import React from 'react';
import { CircularLoader, Icon, Popup } from 'UI';
import cn from 'classnames';

interface Props {
  loading?: boolean;
  onClick: () => void;
  iconSize?: number;
  iconName?: string;
  className?: string;
}
export default function ReloadButton(props: Props) {
  const { loading, onClick, iconSize = '14', iconName = 'sync-alt', className = '' } = props;
  return (
    <Popup content="Refresh">
      <div
        className={cn('h-5 w-6 flex items-center justify-center', className)}
        onClick={onClick}
      >
        {loading ? <CircularLoader className="ml-1" /> : <Icon name={iconName} size={iconSize} />}
      </div>
    </Popup>
  );
}

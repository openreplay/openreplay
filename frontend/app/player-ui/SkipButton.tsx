import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { ForwardOutlined } from '@ant-design/icons';

interface IProps {
  size: number;
  onClick: () => void;
  isBackwards?: boolean;
  customClasses: string;
}

export function SkipButton({ onClick, isBackwards, customClasses }: IProps) {
  return (
    <div
      onClick={onClick}
      className={cn('py-1 px-2 cursor-pointer', customClasses)}
    >
      <ForwardOutlined rotate={isBackwards ? 180 : 0} />
    </div>
  );
}

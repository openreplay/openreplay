import cn from 'classnames';
import { FastForward, Rewind } from 'lucide-react';
import React from 'react';

interface IProps {
  size: number;
  onClick: () => void;
  isBackwards?: boolean;
  customClasses: string;
}

export function SkipButton({ onClick, isBackwards, customClasses }: IProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isBackwards ? 'Skip back' : 'Skip forward'}
      className={cn(
        'm-hover inline-flex items-center py-1 px-2',
        customClasses,
      )}
    >
      {isBackwards ? <Rewind size={14} /> : <FastForward size={14} />}
    </button>
  );
}

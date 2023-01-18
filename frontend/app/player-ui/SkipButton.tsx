import React from 'react'
import { Icon } from 'UI'
import cn from 'classnames'

interface IProps {
  size: number;
  onClick: () => void;
  isBackwards?: boolean;
  customClasses: string;
}

export function SkipButton({ size = 18, onClick, isBackwards, customClasses }: IProps) {

  return (
    <div
      onClick={onClick}
      className={cn('py-1 px-2 hover-main cursor-pointer bg-gray-lightest', customClasses)}
      style={{ transform: isBackwards ? 'rotate(180deg)' : '' }}
    >
      <Icon
        name="skip-forward-fill"
        size={size}
        color="inherit"
      />
    </div>
  )
}
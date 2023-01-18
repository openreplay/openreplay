import React from 'react'
import { Icon } from 'UI'
import cn from 'classnames'

interface IProps {
  size: number;
  onClick: () => void;
  customClasses: string;
}

export function FullScreenButton({ size = 18, onClick, customClasses }: IProps) {

  return (
    <div
      onClick={onClick}
      className={cn('py-1 px-2 hover-main cursor-pointer bg-gray-lightest', customClasses)}
    >
      <Icon
        name="arrows-angle-extend"
        size={size}
        color="inherit"
      />
    </div>
  )
}
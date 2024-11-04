import React from 'react'
import { Icon } from 'UI'
import cn from 'classnames'

interface Props {
    label: string,
    icon?: string,
    comp?: React.ReactNode,
    value: string,
    isLast?: boolean,
}
export default function SessionInfoItem(props: Props) {
    const { label, icon, value, comp, isLast = false } = props
    return (
      <div className={cn('flex items-center w-full py-2 color-gray-dark', { 'border-b': !isLast })}>
        <div className="px-2 capitalize" style={{ width: '30px' }}>
          {icon && <Icon name={icon} size="16" />}
          {comp && comp}
        </div>
        <div className={cn('px-2', /ios/i.test(label) ? '' : 'capitalize')} style={{ minWidth: '160px' }}>
          {label}
        </div>
        <div className="color-gray-medium px-2" style={{ minWidth: '160px' }}>
          {value}
        </div>
      </div>
    );
}

import React from 'react'
import { Popup } from 'UI'
import cn from 'classnames'
import MetaItem from '../MetaItem';
import MetaMoreButton from '../MetaMoreButton';

interface Props {
  className?: string,
  metaList: [],
  maxLength?: number,
}

export default function SessionMetaList(props: Props) {
  const { className = '', metaList, maxLength = 4 } = props
  return (
    <div className={cn("text-sm flex items-start", className)}>
      {metaList.slice(0, maxLength).map(({ label, value }, index) => (
        <MetaItem key={index} label={label} value={''+value} className="mr-3" />
      ))}

      {metaList.length > maxLength && (
        <MetaMoreButton list={metaList} maxLength={maxLength} />
      )}
    </div>
  )
}

import React from 'react'
import { Popup } from 'UI'
import cn from 'classnames'
import MetaItem from '../MetaItem';
import MetaMoreButton from '../MetaMoreButton';

interface Props {
  className?: string,
  metaList: []
}
const MAX_LENGTH = 1;
export default function SessionMetaList(props: Props) {
  const { className = '', metaList } = props
  return (
    <div className={cn("text-sm flex items-start", className)}>
      {metaList.slice(0, MAX_LENGTH).map(({ label, value }, index) => (
        <MetaItem key={index} label={label} value={''+value} className="mr-3" />
      ))}

      {metaList.length > MAX_LENGTH && (
        <MetaMoreButton list={metaList} maxLength={MAX_LENGTH} />
      )}
    </div>
  )
}

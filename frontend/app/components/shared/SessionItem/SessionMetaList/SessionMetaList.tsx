import React from 'react';
import cn from 'classnames';
import MetaItem from '../MetaItem';
import MetaMoreButton from '../MetaMoreButton';

interface Props {
  className?: string;
  metaList: any[];
  maxLength?: number;
  onMetaClick?: (meta: { name: string, value: string }) => void;
  horizontal?: boolean;
}

export default function SessionMetaList(props: Props) {
  const { className = '', metaList, maxLength = 14, horizontal = false } = props;

  return (
    <div className={cn('flex items-center gap-1', horizontal ? '' : 'flex-wrap', className)}>
      {metaList.slice(0, maxLength).map(({ label, value }, index) => (
          <div key={index} className='cursor-pointer' onClick={() => props.onMetaClick?.({ name: `_${label}`, value })}>
            <MetaItem label={label} value={`${value}`} />
          </div>
      ))}

      {metaList.length > maxLength && (
        <MetaMoreButton list={metaList} maxLength={maxLength} />
      )}
    </div>
  );
}

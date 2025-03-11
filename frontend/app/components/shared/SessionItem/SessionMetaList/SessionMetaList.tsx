import React from 'react';
import cn from 'classnames';
import MetaItem from '../MetaItem';
import MetaMoreButton from '../MetaMoreButton';

interface Props {
  className?: string;
  metaList: any[];
  maxLength?: number;
}

export default function SessionMetaList(props: Props) {
  const { className = '', metaList, maxLength = 14 } = props;

  return (
    <div className={cn('flex items-center flex-wrap gap-1', className)}>
      {metaList.slice(0, maxLength).map(({ label, value }, index) => (
        <React.Fragment key={index}>
          <MetaItem label={label} value={`${value}`} />
        </React.Fragment>
      ))}

      {metaList.length > maxLength && (
        <MetaMoreButton list={metaList} maxLength={maxLength} />
      )}
    </div>
  );
}

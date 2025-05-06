import React from 'react';
import cn from 'classnames';
import { TextEllipsis } from 'UI';

interface Props {
  className?: string;
  label: string;
  value?: string;
}
export default function MetaItem(props: Props) {
  const { className = '', label, value } = props;
  return (
    <div
      className={cn(
        'text-sm flex flex-row items-center px-2 py-0 gap-1 rounded-lg bg-white border border-neutral-100 overflow-hidden',
        className,
      )}
    >
      <TextEllipsis
        text={label}
        className="p-0"
        maxWidth={'300px'}
        popupProps={{ size: 'small', disabled: true }}
      />
      <span className="bg-neutral-200 inline-block w-[1px] min-h-[17px]"></span>
      <TextEllipsis
        text={value}
        maxWidth={'350px'}
        className="p-0 text-neutral-500"
        popupProps={{ size: 'small', disabled: true }}
      />
    </div>
  );
}

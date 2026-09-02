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
        'text-sm inline-flex flex-row items-center px-2 py-0 gap-1 rounded-lg bg-white border border-gray-light overflow-hidden max-w-[260px]',
        className,
      )}
    >
      {/* flex:1 1 0 + max-width:max-content => each part grows equally, freezes at its
          natural width, and donates the leftover to the other one */}
      <TextEllipsis
        text={label}
        className="p-0 flex-1 basis-0 min-w-0"
        maxWidth={'max-content'}
        popupProps={{ size: 'small', disabled: true }}
      />
      <span className="bg-gray-light inline-block w-px min-h-[17px] flex-none"></span>
      <TextEllipsis
        text={value}
        maxWidth={'max-content'}
        className="p-0 text-neutral-500 flex-1 basis-0 min-w-0"
        popupProps={{ size: 'small', disabled: true }}
      />
    </div>
  );
}

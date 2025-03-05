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
        'flex items-center rounded border border-gray-light-shade',
        className,
      )}
    >
      <span
        className="rounded-tl rounded-bl bg-gray-light-shade px-2"
        style={{ maxWidth: '150px' }}
      >
        <TextEllipsis
          text={label}
          className="p-0"
          popupProps={{ size: 'small', disabled: true }}
        />
      </span>
      <span
        className="rounded-tr rounded-br bg-white px-2"
        style={{ maxWidth: '150px' }}
      >
        <TextEllipsis
          text={value}
          className="p-0"
          popupProps={{ size: 'small', disabled: true }}
        />
      </span>
    </div>
  );
}

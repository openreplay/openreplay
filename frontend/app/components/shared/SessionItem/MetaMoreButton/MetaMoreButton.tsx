import React from 'react';
import { Popover, Button } from 'UI';
import MetaItem from '../MetaItem';

interface Props {
  list: any[];
  maxLength: number;
}
export default function MetaMoreButton(props: Props) {
  const { list, maxLength } = props;
  return (
    <Popover
      render={() => (
        <div
          className="text-sm grid grid-col p-4 gap-3 bg-white"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        >
          {list.slice(maxLength).map(({ label, value }, index) => (
            <MetaItem key={index} label={label} value={value} />
          ))}
        </div>
      )}
      placement="bottom"
    >
      <div className="flex items-center">
        <Button variant="text-primary">+{list.length - maxLength} More</Button>
      </div>
    </Popover>
  );
}

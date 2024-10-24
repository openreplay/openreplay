import React from "react";
import { Icon } from "UI";
import { CopyOutlined } from "@ant-design/icons";
import { Button } from "antd";
import cn from "classnames";
import copy from "copy-to-clipboard";

export function TableHeader({ size }: { size: number }) {
  return (
    <div className={'grid grid-cols-12 items-center py-2 px-4 bg-gray-lighter'}>
      <div className={'col-span-1'}>timestamp</div>
      <div className={'col-span-1 pl-2'}>status</div>
      <div className={'col-span-10 flex items-center justify-between'}>
        <div>content</div>
        <div>
          <span className={'font-semibold'}>{size}</span> Records
        </div>
      </div>
    </div>
  );
}

export function LogRow({
  log,
}: {
  log: { timestamp: string; status: string; content: string };
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const bg = (status: string) => {
    //types: warn error info none
    if (status === 'WARN') {
      return 'bg-yellow';
    }
    if (status === 'ERROR') {
      return 'bg-red-lightest';
    }
    return 'bg-white';
  };

  const border = (status: string) => {
    //types: warn error info none
    if (status === 'WARN') {
      return 'border-l border-l-4 border-l-amber-500';
    }
    if (status === 'ERROR') {
      return 'border-l border-l-4 border-l-red';
    }
    return 'border-l border-l-4 border-gray-lighter';
  };
  return (
    <div className={'code-font'}>
      <div
        className={cn(
          'text-sm grid grid-cols-12 items-center py-2 px-4',
          'cursor-pointer border-b border-b-gray-light last:border-b-0',
          border(log.status),
          bg(log.status)
        )}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className={'col-span-1'}>
          <div className={'flex items-center gap-2'}>
            <Icon
              name={'chevron-down'}
              className={
                isExpanded ? 'rotate-180 transition' : 'rotate-0 transition'
              }
            />
            <div>{log.timestamp}</div>
          </div>
        </div>
        <div className={'col-span-1 pl-2'}>{log.status}</div>
        <div
          className={
            'col-span-10 whitespace-nowrap overflow-hidden text-ellipsis'
          }
        >
          {log.content}
        </div>
      </div>
      {isExpanded ? (
        <div className={'rounded bg-gray-lighter p-2 relative m-2'}>
          {log.content}

          <div className={'absolute top-1 right-1'}>
            <Button
              size={'small'}
              icon={<CopyOutlined />}
              onClick={() => copy(log.content)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

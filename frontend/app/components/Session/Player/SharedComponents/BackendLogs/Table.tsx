import React from 'react';
import { Icon } from 'UI';
import { CopyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import cn from 'classnames';
import copy from 'copy-to-clipboard';
import { getDateFromString } from 'App/date';

export function TableHeader({ size }: { size: number }) {
  return (
    <div
      className={'grid items-center py-2 px-4 bg-gray-lighter'}
      style={{
        gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
      }}
    >
      <div className={'col-span-2'}>timestamp</div>
      <div className={'col-span-1 pl-2'}>status</div>
      <div className={'col-span-11 flex items-center justify-between'}>
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
          'text-sm grid items-center py-2 px-4',
          'cursor-pointer border-b border-b-gray-light last:border-b-0',
          border(log.status),
          bg(log.status)
        )}
        style={{
          gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
        }}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className={'col-span-2'}>
          <div className={'flex items-center gap-2'}>
            <Icon
              name={'chevron-right'}
              className={
                isExpanded ? 'rotate-90 transition' : 'rotate-0 transition'
              }
            />
            <div className={'whitespace-nowrap'}>
              {getDateFromString(log.timestamp)}
            </div>
          </div>
        </div>
        <div className={'col-span-1 pl-2'}>{log.status}</div>
        <div
          className={
            'col-span-11 whitespace-nowrap overflow-hidden text-ellipsis'
          }
        >
          {log.content}
        </div>
      </div>
      {isExpanded ? (
        <div className={'rounded bg-gray-lightest px-4 py-2 relative mx-4 my-2'}>
          {log.content.split('\n').map((line, index) => (
            <div key={index} className={'flex items-start gap-2'}>
              <div className={'border-r border-r-gray-light pr-2 select-none'}>{index}</div>
              <div className={'whitespace-pre-wrap'}>{line}</div>
            </div>
          ))}

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

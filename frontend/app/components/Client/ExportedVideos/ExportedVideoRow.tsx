import React from 'react';
import { formatDateTimeDefault } from 'App/date';
import { Button, Tag } from 'antd';
import { FileDown, Trash } from 'lucide-react';

interface VideoRow {
  sessionId: string;
  createdAt: number;
  userId: number;
  status: string;
  userName: string;
}

function ExportedVideo(props: {
  item: VideoRow;
  onSessionOpen: (sessionId: string) => void;
  onRecOpen: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}) {
  const getColor = (status: string) => {
    if (status === 'success') return 'success';
    if (status === 'failure') return 'error';
    return undefined;
  };
  return (
    <div className="grid grid-cols-12 py-4 px-4 border-t items-center select-none hover:bg-active-blue group h-[55px]">
      <div className="col-span-3">
        <div
          className="link"
          onClick={() => props.onSessionOpen(props.item.sessionId)}
        >
          {props.item.sessionId}
        </div>
      </div>
      <div className="col-span-3">
        {formatDateTimeDefault(props.item.createdAt * 1000)}
      </div>
      <div className="col-span-2">{props.item.userName || 'Unknown user'}</div>
      <div className="col-span-2">
        <Tag
          color={getColor(props.item.status)}
          className="rounded-lg capitalize"
        >
          {props.item.status}
        </Tag>
      </div>
      <div className="col-span-2 items-center justify-end gap-2 hidden group-hover:flex w-full">
        {props.item.status === 'success' ? (
          <Button
            onClick={() => props.onRecOpen(props.item.sessionId)}
            size={'small'}
          >
            <FileDown size={16} />
          </Button>
        ) : null}
        <Button
          onClick={() => props.onDelete(props.item.sessionId)}
          size={'small'}
        >
          <Trash size={16} />
        </Button>
      </div>
    </div>
  );
}

export default React.memo(ExportedVideo);

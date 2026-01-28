import React from 'react';
import { Tooltip } from 'UI';
import { CaretRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { shortDurationFromMs } from 'App/date';

interface Props {
  onClick: any;
  time?: number;
  tooltip?: string;
  extra?: React.ReactNode;
}
function JumpButton(props: Props) {
  const { tooltip } = props;
  return (
    <div className="absolute right-2 top-0 bottom-0 my-auto flex items-center gap-2">
      {props.extra ? (
        <div className={'hidden group-hover:flex gap-2 items-center'}>
          {props.extra}
        </div>
      ) : null}
      <Tooltip title={tooltip}>
        <div
          className="hidden group-hover:flex rounded-md text-xs px-1 py-0 h-5 items-center gap-2 border cursor-pointer hover:border-teal! hover:text-teal!"
          onClick={(e: any) => {
            e.stopPropagation();
            props.onClick();
          }}
        >
          <span>JUMP</span>
          <CaretRightOutlined />
        </div>
        {props.time ? (
          <div className="block group-hover:hidden mr-2 text-sm">
            {shortDurationFromMs(props.time)}
          </div>
        ) : null}
      </Tooltip>
    </div>
  );
}

export default JumpButton;

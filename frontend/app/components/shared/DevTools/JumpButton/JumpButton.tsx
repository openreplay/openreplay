import React from 'react';
import { Tooltip } from 'UI';
import { CaretRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { shortDurationFromMs } from 'App/date';

interface Props {
  onClick: any;
  time?: number;
  tooltip?: string;
}
function JumpButton(props: Props) {
  const { tooltip } = props;
  return (
    <div className="absolute right-2 top-0 bottom-0 my-auto flex items-center">
      <Tooltip title={tooltip} disabled={!tooltip}>
        <Button
          type="default"
          size="small"
          className="hidden group-hover:flex rounded-lg text-xs p-1 py-0 gap-0 h-6"
          iconPosition="end"
          onClick={(e: any) => {
            e.stopPropagation();
            props.onClick();
          }}
          icon={<CaretRightOutlined />}
        >
          JUMP
        </Button>
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

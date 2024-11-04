import React from 'react';
import { Icon, Tooltip } from 'UI';
import { shortDurationFromMs } from "App/date";

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
        <div
          className="border cursor-pointer hidden group-hover:flex rounded bg-white text-xs items-center px-2 py-1 color-teal hover:shadow h-6"
          onClick={(e: any) => {
            e.stopPropagation();
            props.onClick();
          }}
        >
          <Icon name="caret-right-fill" size="12" color="teal" />
          <span>JUMP</span>
        </div>
        {props.time ? <div className={'block group-hover:hidden mr-2'}>
          {shortDurationFromMs(props.time)}
        </div> : null}
      </Tooltip>
    </div>
  );
}

export default JumpButton;

import React from 'react';
import { Icon, Tooltip } from 'UI';

interface Props {
  onClick: any;
  tooltip?: string;
}
function JumpButton(props: Props) {
  const { tooltip } = props;
  return (
    <div className="absolute right-0 top-0 bottom-0 my-auto flex items-center">
      <Tooltip title={tooltip} disabled={!tooltip}>
        <div
          className="mr-2 border cursor-pointer invisible group-hover:visible rounded-lg bg-active-blue text-xs flex items-center px-2 py-1 color-teal hover:shadow h-6"
          onClick={(e: any) => {
            e.stopPropagation();
            props.onClick();
          }}
        >
          <Icon name="caret-right-fill" size="12" color="teal" />
          <span>JUMP</span>
        </div>
      </Tooltip>
    </div>
  );
}

export default JumpButton;

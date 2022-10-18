import React from 'react';
import { Icon, Popup } from 'UI';

interface Props {
  onClick: any;
  tooltip?: string;
}
function JumpButton(props: Props) {
  const { tooltip = '' } = props;
  return (
    <Popup content={tooltip} disabled={!!tooltip}>
      <div
        className="mr-2 border cursor-pointer invisible group-hover:visible rounded-lg bg-active-blue text-xs flex items-center px-2 py-1 color-teal absolute right-0 top-0 bottom-0 hover:shadow h-6 my-auto"
        onClick={(e: any) => {
          e.stopPropagation();
          props.onClick();
        }}
      >
        <Icon name="caret-right-fill" size="12" color="teal" />
        <span>JUMP</span>
      </div>
    </Popup>
  );
}

export default JumpButton;

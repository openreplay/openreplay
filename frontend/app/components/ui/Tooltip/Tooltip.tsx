import React from 'react';
import { useTooltipState, TooltipAnchor, FloatingTooltip } from './FloatingTooltip';

interface Props {
  // position: string;
  tooltip: string;
  children: any;
}
function Tooltip(props: Props) {
  const state = useTooltipState();
  return (
    <>
      <TooltipAnchor state={state}>{props.children}</TooltipAnchor>
      <FloatingTooltip state={state} className="bg-gray-darkest color-white rounded py-1 px-2 animate-fade">
        {props.tooltip}
      </FloatingTooltip>
    </>
  );
}

export default Tooltip;

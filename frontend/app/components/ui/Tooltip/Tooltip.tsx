import React from 'react';
import { useTooltipState, TooltipAnchor, FloatingTooltip } from './FloatingTooltip';
import type { Placement } from '@floating-ui/react-dom-interactions';
import cn from 'classnames';

interface Props {
  title?: any;
  children: any;
  disabled?: boolean;
  open?: boolean;
  placement?: Placement;
  className?: string;
  delay?: number;
  style?: any;
}
function Tooltip(props: Props) {
  const {
    title,
    disabled = false,
    open = false,
    placement,
    className = '',
    delay = 500,
    style = {},
  } = props;
  const state = useTooltipState({ disabled: disabled, placement, delay });
  return (
    <>
      <TooltipAnchor state={state}>{props.children}</TooltipAnchor>
      <FloatingTooltip
        state={state}
        className={cn('bg-gray-darkest color-white rounded py-1 px-2 animate-fade', className)}
      >
        {title}
      </FloatingTooltip>
    </>
  );
}

export default Tooltip;

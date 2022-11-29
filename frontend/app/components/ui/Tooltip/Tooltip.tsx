import React from 'react';
import { useTooltipState, TooltipAnchor, FloatingTooltip, FloatingArrow } from './FloatingTooltip';
import type { Placement } from '@floating-ui/react-dom-interactions';
import cn from 'classnames';

interface Props {
  title?: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  open?: boolean;
  placement?: Placement;
  className?: string;
  delay?: number;
  style?: any;
  offset?: number;
  anchorClassName?: string;
}
function Tooltip(props: Props) {
  const {
    title,
    disabled = false,
    open = false,
    placement,
    className = '',
    anchorClassName = '',
    delay = 500,
    style = {},
    offset = 5,
  } = props;
  const arrowRef = React.useRef(null);

  const state = useTooltipState({
    disabled: disabled,
    placement,
    delay,
    initialOpen: open,
    offset,
    arrowRef,
  });

  return (
    <div className="relative">
      <TooltipAnchor className={anchorClassName} state={state}>{props.children}</TooltipAnchor>
      <FloatingTooltip
        state={state}
        className={cn('bg-gray-darkest color-white rounded py-1 px-2 animate-fade', className)}
      >
        {title}
        {/* <FloatingArrow state={state} className="" /> */}
      </FloatingTooltip>
    </div>
  );
}

export default Tooltip;

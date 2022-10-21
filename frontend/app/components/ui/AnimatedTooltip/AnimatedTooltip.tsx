import React, { cloneElement, useMemo, useState } from 'react';
import {
  Placement,
  offset,
  flip,
  shift,
  autoUpdate,
  useFloating,
  useInteractions,
  useHover,
  useFocus,
  useRole,
  useDismiss,
  useClick,
} from '@floating-ui/react-dom-interactions';
import { mergeRefs } from 'react-merge-refs';

interface Props {
  label: string;
  placement?: Placement;
  children: JSX.Element;
}

function AnimatedTooltip({ children, label, placement = 'top' }: Props) {
  const [open, setOpen] = useState(false);

  const { x, y, reference, floating, strategy, context } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    middleware: [offset(5), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    // useHover(context),
    useFocus(context),
    useRole(context, { role: 'tooltip' }),
    useDismiss(context),
    useClick(context),
  ]);

  // Preserve the consumer's ref
  const ref = useMemo(() => mergeRefs([reference, (children as any).ref]), [reference, children]);
  const ppp = getReferenceProps({ ref, ...children.props });
  //   console.log('ppp', ppp);
  return (
    <div>
      {/* {cloneElement(children, getReferenceProps({ ref, ...children.props }))} */}
      <button ref={reference} {...getReferenceProps({ ref, ...children.props })}>Button</button>
      {open && (
        <div
          ref={floating}
          className="Tooltip"
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
          }}
          {...getFloatingProps()}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default AnimatedTooltip;

import React, { cloneElement, useEffect, useMemo, useState } from 'react';
import {
  Placement,
  offset,
  flip,
  shift,
  autoUpdate,
  useFloating,
  useInteractions,
  useRole,
  useDismiss,
  useId,
  useClick,
  FloatingFocusManager,
} from '@floating-ui/react-dom-interactions';
import { mergeRefs } from 'react-merge-refs';
import { INDEXES } from 'App/constants/zindex';

interface Props {
  render: (data: { close: () => void; labelId: string; descriptionId: string }) => React.ReactNode;
  placement?: Placement;
  children: JSX.Element;
  onOpen?: () => void;
  onClose?: () => void;
}

const Popover = ({ children, render, placement, onOpen, onClose }: Props) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [open]);

  const { x, y, reference, floating, strategy, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(5), flip(), shift()],
    placement,
    whileElementsMounted: autoUpdate,
  });

  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useRole(context),
    useDismiss(context),
  ]);

  // Preserve the consumer's ref
  const ref = useMemo(() => mergeRefs([reference, (children as any).ref]), [reference, children]);

  return (
    <>
      {cloneElement(children, getReferenceProps({ ref, ...children.props }))}
      {open && (
        <FloatingFocusManager
          context={context}
          modal={true}
          order={['reference', 'content']}
          returnFocus={false}
        >
          <div
            ref={floating}
            className="rounded border shadow"
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              zIndex: INDEXES.TOOLTIP,
            }}
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            {...getFloatingProps()}
          >
            {render({
              labelId,
              descriptionId,
              close: () => {
                setOpen(false);
              },
            })}
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
};

export default Popover;

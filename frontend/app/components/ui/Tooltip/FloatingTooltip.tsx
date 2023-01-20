import * as React from 'react';
import { mergeRefs } from 'react-merge-refs';
import {
  useFloating,
  autoUpdate,
  offset as _offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  arrow,

} from '@floating-ui/react-dom-interactions';
import type { Placement } from '@floating-ui/react-dom-interactions';
import { INDEXES } from 'App/constants/zindex';

export function useTooltipState({
  disabled = false,
  initialOpen = false,
  placement = 'top',
  offset = 5,
  delay,
  arrowRef = null,
}: {
  disabled?: boolean;
  initialOpen?: boolean;
  placement?: Placement;
  offset?: number;
  delay?: number;
  arrowRef?: any;
} = {}) {
  const [open, setOpen] = React.useState(initialOpen);
  const staticSide = mapPlacementSideToCSSProperty(placement);

  React.useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [_offset(offset), flip(), shift(), arrow({ element: arrowRef })],
  });

  const context = data.context;

  const hover = useHover(context, { move: false, restMs: delay, enabled: !disabled });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const interactions = useInteractions([hover, focus, dismiss, role]);

  return React.useMemo(
    () => ({
      open,
      setOpen,
      arrowRef,
      ...interactions,
      ...data,
      staticSide,
    }),
    [open, setOpen, interactions, data]
  );
}

type TooltipState = ReturnType<typeof useTooltipState>;

export const TooltipAnchor = React.forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & {
    state: TooltipState;
    asChild?: boolean;
  }
>(function TooltipAnchor({ children, state, asChild = false, ...props }, propRef) {
  const childrenRef = (children as any).ref;

  const ref = React.useMemo(
    () => mergeRefs([state.reference, propRef, childrenRef]),
    [state.reference, propRef, childrenRef]
  );

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children,
      state.getReferenceProps({ ref, ...props, ...children.props })
    );
  }

  return (
    <div ref={ref} {...state.getReferenceProps(props)}>
      {children}
    </div>
  );
});

export const FloatingTooltip = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & { state: TooltipState }
>(function Tooltip({ state, ...props }, propRef) {
  const ref = React.useMemo(() => mergeRefs([state.floating, propRef]), [state.floating, propRef]);

  return (
    <FloatingPortal>
      {state.open && (
        <div
          ref={ref}
          style={{
            position: state.strategy,
            top: state.y ?? 0,
            left: state.x ?? 0,
            visibility: state.x == null ? 'hidden' : 'visible',
            transition: 'opacity 1s',
            zIndex: INDEXES.TOOLTIP,
            ...props.style,
          }}
          {...state.getFloatingProps(props)}
        />
      )}
    </FloatingPortal>
  );
});

function mapPlacementSideToCSSProperty(placement: Placement) {
  const staticSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[placement.split('-')[0]];

  return staticSide;
}

export const FloatingArrow = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & { state: TooltipState }
>(function Tooltip({ state, ...props }, propRef) {
  const ref = React.useMemo(() => state.arrowRef, [state.arrowRef, propRef]);
  const { x: arrowX, y: arrowY } = state.middlewareData?.arrow || { x: 0, y: 0 };
  const staticSide = state.staticSide;

  return (
    <FloatingPortal>
      {state.open && (
        <div
          ref={ref}
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: 'white',
            position: state.strategy,
            left: arrowX != null ? `${arrowX + state.x}px` : '',
            top: arrowY != null ? `${arrowY + state.y}px` : '',
            [staticSide]: '-10px',
            zIndex: INDEXES.TOOLTIP - 1,
            transform: 'rotate(45deg)',
            ...props.style,
          }}
          {...state.getFloatingProps(props)}
        />
      )}
    </FloatingPortal>
  );
});

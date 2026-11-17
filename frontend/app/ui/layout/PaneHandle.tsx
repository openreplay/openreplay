import { cn } from '@/lib/utils';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import './pane-handle.css';

export interface PaneHandleProps {
  open: boolean;
  width: number;
  min: number;
  max: number;
  closeBelow?: number;
  onWidth: (width: number) => void;
  onOpen: (open: boolean) => void;
  onDragging?: (dragging: boolean) => void;
  name: string;
  className?: string;
  style?: CSSProperties;
}

export function PaneHandle({
  open,
  width,
  min,
  max,
  closeBelow = min * 0.6,
  onWidth,
  onOpen,
  onDragging,
  name,
  className,
  style,
}: PaneHandleProps) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    x: number;
    w: number;
    moved: boolean;
    last: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        x: e.clientX,
        w: open ? width : 0,
        moved: false,
        last: open ? width : 0,
      };
    },
    [open, width],
  );
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty(
        '--m-grip-y',
        `${Math.round(e.clientY - box.top)}px`,
      );
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) < 4) return;
      if (!d.moved) {
        d.moved = true;
        setDragging(true);
        onDragging?.(true);
      }
      const w = d.w + dx;
      d.last = w;
      if (w >= closeBelow) {
        if (!open) onOpen(true);
        onWidth(Math.min(max, Math.max(min, w)));
      }
    },
    [closeBelow, max, min, onDragging, onOpen, onWidth, open],
  );
  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      onOpen(!open);
      return;
    }
    setDragging(false);
    onDragging?.(false);
    if (d.last < closeBelow) onOpen(false);
  }, [closeBelow, onDragging, onOpen, open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(!open);
    } else if (open && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      onWidth(
        Math.min(
          max,
          Math.max(min, width + (e.key === 'ArrowRight' ? 16 : -16)),
        ),
      );
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={
        open
          ? t('Resize {{name}}. Click to hide them.', { name })
          : t('Show {{name}}', { name })
      }
      aria-valuenow={open ? Math.round(width) : 0}
      aria-valuemin={0}
      aria-valuemax={max}
      tabIndex={0}
      className={cn(
        'm-pane-handle',
        open ? 'is-open' : 'is-closed',
        dragging && 'is-dragging',
        className,
      )}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <span className="m-pane-handle__line" aria-hidden="true">
        <span className="m-pane-handle__grip" />
      </span>
    </div>
  );
}

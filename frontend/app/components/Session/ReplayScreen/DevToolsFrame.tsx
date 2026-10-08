import { Tooltip } from '@/ui/overlays/tooltip';
import { ChevronDown } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { PanelHostContext } from 'Shared/DevTools/BottomBlock/Header';

import './dev-tools.css';

const MIN_HEIGHT = 120;
const OWNS_CLOSE = { ownsClose: true };

export interface DevToolsTab<K extends string | number> {
  key: K;
  label: string;
  hint?: string;
  errors?: boolean;
  /** stays enabled when the strip is disabled */
  always?: boolean;
}

interface Props<K extends string | number> {
  tabs: DevToolsTab<K>[];
  /** the open tab, or a falsy value when collapsed */
  open: K | null | 0;
  onToggle: (key: K) => void;
  height: number;
  onHeight: (h: number) => void;
  disabled?: boolean;
  /** controls at the strip's right edge, before the collapse button */
  extras?: ReactNode;
  children: ReactNode;
}

/** Chrome-style strip between the stage and the transport; its panel opens above. */
export function DevToolsFrame<K extends string | number>({
  tabs,
  open,
  onToggle,
  height,
  onHeight,
  disabled,
  extras,
  children,
}: Props<K>) {
  const { t } = useTranslation();
  const box = React.useRef<HTMLDivElement>(null);
  // ends an in-flight resize; also run on unmount so the listeners can't outlive the strip
  const endDrag = React.useRef<(() => void) | null>(null);
  React.useEffect(() => () => endDrag.current?.(), []);

  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const host = box.current?.parentElement;
    if (!host) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startH = height;
    const max = host.getBoundingClientRect().height * 0.75;
    const move = (ev: PointerEvent) =>
      onHeight(
        Math.min(max, Math.max(MIN_HEIGHT, startH + (startY - ev.clientY))),
      );
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      endDrag.current = null;
    };
    endDrag.current?.();
    endDrag.current = up;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div ref={box} className={`m-dt${open ? ' is-open' : ''}`}>
      {open ? (
        <div
          className="m-dt__handle"
          onPointerDown={onHandleDown}
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('Resize the panel')}
        />
      ) : null}
      <div
        className="m-dt__strip"
        data-replay-dockline
        role="tablist"
        aria-label={t('Developer tools')}
      >
        {tabs.map((x) => (
          <Tooltip key={x.key} title={x.hint} delay={500}>
            <button
              type="button"
              role="tab"
              aria-selected={open === x.key}
              disabled={disabled && !x.always}
              className={`m-dt__tab${open === x.key ? ' is-on' : ''}`}
              onClick={() => onToggle(x.key)}
            >
              {x.errors && (
                <i className="m-dt__err" aria-label={t('has errors')} />
              )}
              {x.label}
            </button>
          </Tooltip>
        ))}
        <span className="m-dt__extras">
          {extras}
          {open ? (
            <button
              type="button"
              className="m-dt__collapse"
              onClick={() => onToggle(open as K)}
              aria-label={t('Collapse the panel')}
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>
      {open ? (
        <div className="m-dt__body" role="tabpanel" style={{ height }}>
          <PanelHostContext.Provider value={OWNS_CLOSE}>
            {children}
          </PanelHostContext.Provider>
        </div>
      ) : null}
    </div>
  );
}

import { Truncated } from '@/ui/data/truncated';
import { Tooltip } from '@/ui/overlays/tooltip';
import { ChevronLeft, ChevronRight, ListX, X } from 'lucide-react';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';
import { MetaChips } from 'Shared/SessionsTable/MetaChips';

import { type QueuedSession, onLanding } from './openSessions';
import './sessions-dock.css';

/** The bar the dock rests as, in px. */
const BAR_W = 134;
const BAR_H = 5;
/** Over a replay without a panel strip: the foot's gap above the recording. */
const STAGE_GAP = 24;
/** How long the dock stays up after the pointer leaves. */
const LINGER = 380;
/** How long a switch protects the dock from a leave it did not earn. */
const HOLD = 900;
/** How long the landing pill shows an arrival. */
const PEEK = 1400;
/** Tabs in view at once; the arrows reach the rest. */
const IN_VIEW = 4;

export interface SessionsDockProps {
  rows: readonly QueuedSession[];
  /** the one on screen, if a replay is open */
  currentId: string | null;
  onPick: (s: QueuedSession) => void;
  onClose: (id: string) => void;
  onClear: () => void;
  /** a replay is on screen: the dock lifts clear of the player's foot */
  overReplay?: boolean;
}

/**
 * The replay queue as a dock: a bar at rest, the dock under the pointer, and a
 * pill with the arrival's name when a session lands. One tab per queued
 * session (avatar, name, metadata); the one on screen is a lit surface that
 * travels. Four in view, arrows for the rest, "Close all" at the end.
 */
export function SessionsDock({
  rows,
  currentId,
  onPick,
  onClose,
  onClear,
  overReplay = false,
}: SessionsDockProps) {
  const { t } = useTranslation();

  /* ── open / at rest ── */
  const [hover, setHover] = useState(false);
  const leaveTimer = useRef<number | null>(null);
  const enter = useCallback(() => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
    setHover(true);
  }, []);
  // Switching tabs moves the dock out from under a still pointer and the browser
  // fires pointerleave; for a moment after a switch that is not a goodbye.
  const held = useRef(0);
  const leave = useCallback(() => {
    if (performance.now() - held.current < HOLD) return;
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHover(false), LINGER);
  }, []);

  const reach = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!currentId) return;
    held.current = performance.now();
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  }, [currentId]);
  useEffect(() => {
    if (!hover) return undefined;
    const onMove = (e: PointerEvent) => {
      const box = reach.current?.getBoundingClientRect();
      if (!box) return;
      const inside =
        e.clientX >= box.left &&
        e.clientX <= box.right &&
        e.clientY >= box.top &&
        e.clientY <= box.bottom;
      if (!inside) leave();
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [hover, leave]);

  /* ── the landing ── */
  const [peek, setPeek] = useState<QueuedSession | null>(null);
  useEffect(() => onLanding(setPeek), []);
  useEffect(() => {
    if (!peek) return undefined;
    const id = window.setTimeout(() => setPeek(null), PEEK);
    return () => window.clearTimeout(id);
  }, [peek]);
  const open = hover;
  const peeking = !open && peek != null;

  /* ── over a replay: on the panel tab strip, which moves with the open
     panel; without one (fullscreen) just above the recording ── */
  const zone = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  useLayoutEffect(() => {
    if (!overReplay) return undefined;
    const measure = () => {
      const stage = document.querySelector('[data-replay-stage]');
      const host = zone.current?.offsetParent as HTMLElement | null;
      if (!stage || !host) return;
      const line = document.querySelector('[data-replay-dockline]');
      const row = line?.getBoundingClientRect();
      // 2px: the pill is the row's height less 2px each side
      const foot =
        row && row.height
          ? row.bottom - 2
          : stage.getBoundingClientRect().bottom - STAGE_GAP;
      setLift(
        Math.max(0, Math.round(host.getBoundingClientRect().bottom - foot)),
      );
    };
    const ro = new ResizeObserver(measure);
    if (zone.current?.offsetParent) ro.observe(zone.current.offsetParent);
    // the stage mounts once the session loads; look for it until it does,
    // giving up after a while (an error screen never mounts one)
    let poll = 0;
    let tries = 0;
    const attach = () => {
      const stage = document.querySelector('[data-replay-stage]');
      tries += 1;
      if (stage) {
        ro.observe(stage);
        const line = document.querySelector('[data-replay-dockline]');
        if (line) ro.observe(line);
        measure();
      }
      if (stage || tries > 120) window.clearInterval(poll);
    };
    attach();
    poll = window.setInterval(attach, 250);
    return () => {
      window.clearInterval(poll);
      ro.disconnect();
    };
  }, [overReplay, currentId]);

  /* ── the dock's own sizes, for the morph ── */
  const body = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [pillSize, setPillSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows.length]);
  useLayoutEffect(() => {
    const el = pill.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPillSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
  }, [peek]);

  /* ── the strip: four in view, and what has scrolled off its left ── */
  const strip = useRef<HTMLDivElement>(null);
  const [stripMax, setStripMax] = useState<number | null>(null);
  useLayoutEffect(() => {
    const s = strip.current;
    if (!s) return;
    const tabs = [...s.querySelectorAll<HTMLElement>('.m-sdock__tab')];
    if (tabs.length <= IN_VIEW) {
      setStripMax(null);
      return;
    }
    const gap = parseFloat(getComputedStyle(s).columnGap) || 0;
    setStripMax(
      tabs.slice(0, IN_VIEW).reduce((w, tab) => w + tab.offsetWidth, 0) +
        gap * (IN_VIEW - 1),
    );
  }, [rows]);
  const [hiddenLeft, setHiddenLeft] = useState(0);
  const [canRight, setCanRight] = useState(false);
  const readScroll = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const gone = rows.filter((s) => {
      const tab = el.querySelector<HTMLElement>(
        `[data-session="${CSS.escape(s.id)}"]`,
      );
      return tab
        ? tab.offsetLeft + tab.offsetWidth <= el.scrollLeft + 4
        : false;
    }).length;
    setHiddenLeft(gone);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, [rows]);
  useEffect(readScroll, [readScroll, size, open, stripMax]);

  // only the arrows move the strip, one tab per press
  const scrollTabs = (dir: 1 | -1) => {
    const s = strip.current;
    const first = s?.querySelector<HTMLElement>('.m-sdock__tab');
    if (!s || !first) return;
    s.scrollBy({ left: dir * (first.offsetWidth + 2), behavior: 'smooth' });
  };
  useEffect(() => {
    if (!currentId) return;
    strip.current
      ?.querySelector<HTMLElement>(`[data-session="${CSS.escape(currentId)}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [currentId]);

  /* ── the lit surface ── */
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const [live, setLive] = useState(false);
  useLayoutEffect(() => {
    const host = strip.current;
    if (!host || !currentId) {
      setThumb(null);
      setLive(false);
      return undefined;
    }
    const measure = () => {
      const el = host.querySelector<HTMLElement>(
        `[data-session="${CSS.escape(currentId)}"]`,
      );
      setThumb(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(() => {
      setLive(false);
      measure();
      requestAnimationFrame(() => setLive(true));
    });
    ro.observe(host);
    const id = requestAnimationFrame(() => setLive(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [currentId, rows.length]);

  if (rows.length === 0) return null;

  const style = {
    '--m-morph-w0': `${BAR_W}px`,
    '--m-morph-h0': `${BAR_H}px`,
    '--m-sdock-w': size ? `${size.w}px` : `${BAR_W}px`,
    '--m-sdock-h': size ? `${size.h}px` : `${BAR_H}px`,
    '--m-sdock-pw': pillSize ? `${pillSize.w}px` : `${BAR_W}px`,
    '--m-sdock-ph': pillSize ? `${pillSize.h}px` : `${BAR_H}px`,
  } as CSSProperties;
  const state = open ? ' is-open' : peeking ? ' is-peek' : '';

  return (
    <div className="m-sdock-anchor">
      <div
        ref={zone}
        className={`m-sdock-zone${open ? ' is-open' : ''}${overReplay ? ' is-over-replay' : ''}`}
        style={
          overReplay
            ? ({ '--m-sdock-lift': `${lift}px` } as CSSProperties)
            : undefined
        }
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocusCapture={enter}
        onBlurCapture={leave}
      >
        <div className="m-sdock-reach" ref={reach}>
          <div
            className={`m-sdock m-morph${state}`}
            style={style}
            aria-label={t('Replay queue')}
            aria-expanded={open}
          >
            {peek && (
              <div className="m-sdock__pill" ref={pill} aria-hidden={!peeking}>
                <SessionAvatar seed={peek.seed} size={20} />
                <span className="m-sdock__pill-name m-truncate">
                  {peek.name}
                </span>
              </div>
            )}
            <div className="m-sdock__body" ref={body}>
              {hiddenLeft > 0 && (
                <button
                  type="button"
                  className="m-sdock__arrow m-sdock__arrow--left"
                  aria-label={t('{{count}} more to the left', {
                    count: hiddenLeft,
                  })}
                  onClick={() => scrollTabs(-1)}
                >
                  <ChevronLeft size={13} aria-hidden="true" />
                </button>
              )}
              <div
                className="m-sdock__strip"
                role="tablist"
                ref={strip}
                onScroll={readScroll}
                style={stripMax != null ? { maxWidth: stripMax } : undefined}
              >
                {thumb && (
                  <span
                    className={`m-sdock__thumb m-travel${live ? ' is-live' : ''}`}
                    style={{
                      transform: `translateX(${thumb.x}px)`,
                      width: thumb.w,
                    }}
                    aria-hidden="true"
                  />
                )}
                {rows.map((s) => {
                  const on = s.id === currentId;
                  return (
                    <span
                      key={s.id}
                      className={`m-sdock__tab${on ? ' is-on' : ''}`}
                      data-session={s.id}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={on}
                        className="m-sdock__open"
                        onClick={() => onPick(s)}
                      >
                        <SessionAvatar seed={s.seed} size={20} />
                        <span className="m-sdock__text">
                          <Truncated
                            text={s.name}
                            className="m-sdock__name"
                            delay={700}
                          />
                          <MetaChips metadata={s.metadata} />
                        </span>
                      </button>
                      <button
                        type="button"
                        className="m-sdock__close"
                        aria-label={t('Close {{name}}', { name: s.name })}
                        onClick={() => onClose(s.id)}
                      >
                        <X size={11} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
              </div>
              {canRight && (
                <button
                  type="button"
                  className="m-sdock__arrow m-sdock__arrow--right"
                  aria-label={t('More to the right')}
                  onClick={() => scrollTabs(1)}
                >
                  <ChevronRight size={13} aria-hidden="true" />
                </button>
              )}
              {rows.length > 1 && (
                <Tooltip title={t('Close all')} side="top" delay={400}>
                  <button
                    type="button"
                    className="m-sdock__clear"
                    aria-label={t('Close all')}
                    onClick={onClear}
                  >
                    <ListX size={14} aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

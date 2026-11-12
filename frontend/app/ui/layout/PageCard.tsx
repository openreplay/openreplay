import { Button } from '@/ui/actions/button';
import { EditableTitle } from '@/ui/inputs/EditableTitle';
import { ArrowLeft } from 'lucide-react';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import './page-card.css';
import { useViewport } from './use-viewport';

export interface PageCardProps {
  back?: { label: string; onClick: () => void };
  title: string;
  /** rename in place: the title gets a pencil on hover */
  onTitleChange?: (title: string) => void;

  subtitle?: string;

  meta?: ReactNode;

  lede?: ReactNode;

  actions?: ReactNode;

  tabs?: ReactNode;

  toolbar?: ReactNode;

  split?: boolean;
  children: ReactNode;
}

/* At phone a page's search is an icon; the first toolbar row or panel head
   offers it a seat, so the opened field covers that row. */
const SearchSlot = createContext<{
  slot: HTMLElement | null;
  offer: (el: HTMLElement | null) => void;
} | null>(null);

export function usePageSearchSlot(): HTMLElement | null {
  return useContext(SearchSlot)?.slot ?? null;
}

function SearchSeat() {
  const phone = useViewport() === 'phone';
  const ctx = useContext(SearchSlot);
  return phone && ctx ? (
    <span className="m-psearch-slot" ref={ctx.offer} />
  ) : null;
}

export function PageCard({
  back,
  title,
  onTitleChange,
  subtitle,
  meta,
  lede,
  actions,
  tabs,
  toolbar,
  split,
  children,
}: PageCardProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // the first seat that offers wins; it withdraws when it unmounts
  const offer = useCallback(
    (el: HTMLElement | null) => setSlot((cur) => (el ? (cur ?? el) : null)),
    [],
  );
  return (
    <SearchSlot.Provider value={{ slot, offer }}>
      <section className={`m-page${tabs ? ' m-page--tabbed' : ''}`}>
        <header className="m-page__head">
          {back && (
            <Button
              variant="subtle"
              onClick={back.onClick}
              className="m-page__back"
            >
              <ArrowLeft size={15} />
              {back.label}
            </Button>
          )}
          <div className="m-page__lead">
            {/* the meta is a fact about the title: it rides the title's line */}
            <div className="m-page__titlerow">
              {onTitleChange ? (
                <EditableTitle
                  title={title}
                  onChange={onTitleChange}
                  heading={(text) => <h1 className="m-page__title">{text}</h1>}
                />
              ) : (
                <h1 className="m-page__title">{title}</h1>
              )}
              {meta != null && <span className="m-page__meta">{meta}</span>}
            </div>
            {subtitle && <p className="m-page__sub">{subtitle}</p>}
          </div>
          {lede}
          {actions && <div className="m-page__actions">{actions}</div>}
        </header>
        {tabs && <div className="m-page__tabs">{tabs}</div>}
        <div className="m-page__body">
          {split ? children : <PagePanel head={toolbar}>{children}</PagePanel>}
        </div>
      </section>
    </SearchSlot.Provider>
  );
}

export function PageToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="m-page__toolbar">
      <SearchSeat />
      {children}
    </div>
  );
}

export function PagePanel({
  head,
  spills,
  children,
}: {
  head?: ReactNode;

  spills?: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    const host = box.current;
    if (!el || !host) return undefined;
    const publish = () =>
      host.style.setProperty(
        '--m-panel-head-h',
        `${Math.round(el.offsetHeight)}px`,
      );
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
    // the observer follows the head's size; only its presence matters here
  }, [!!head]);

  // once the panel's top has scrolled away, the pinned head draws it
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    // measured against the box that scrolls, not the window
    let root: HTMLElement | null = el.parentElement;
    while (root && !/(auto|scroll)/.test(getComputedStyle(root).overflowY))
      root = root.parentElement;
    const io = new IntersectionObserver(
      ([e]) =>
        setStuck(
          !!e &&
            !e.isIntersecting &&
            e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + 1,
        ),
      { root, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [!!head]);

  return (
    <section className={`m-panel${spills ? ' is-spilling' : ''}`} ref={box}>
      {head && (
        <div className="m-panel__sentinel" ref={sentinel} aria-hidden="true" />
      )}
      {head && (
        <div className={`m-panel__head${stuck ? ' is-stuck' : ''}`} ref={bar}>
          <SearchSeat />
          {head}
        </div>
      )}
      {children}
    </section>
  );
}

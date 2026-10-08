import { Button } from '@/ui/actions/button';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

import './page-card.css';

export interface PageCardProps {
  back?: { label: string; onClick: () => void };
  title: string;

  subtitle?: string;

  meta?: ReactNode;

  lede?: ReactNode;

  actions?: ReactNode;

  tabs?: ReactNode;

  toolbar?: ReactNode;

  split?: boolean;
  children: ReactNode;
}

export function PageCard({
  back,
  title,
  subtitle,
  meta,
  lede,
  actions,
  tabs,
  toolbar,
  split,
  children,
}: PageCardProps) {
  return (
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
          <h1 className="m-page__title">{title}</h1>
          {subtitle && <p className="m-page__sub">{subtitle}</p>}
        </div>
        {meta != null && <span className="m-page__meta">{meta}</span>}
        {lede}
        {actions && <div className="m-page__actions">{actions}</div>}
      </header>
      {tabs && <div className="m-page__tabs">{tabs}</div>}
      <div className="m-page__body">
        {split ? children : <PagePanel head={toolbar}>{children}</PagePanel>}
      </div>
    </section>
  );
}

export function PageToolbar({ children }: { children: ReactNode }) {
  return <div className="m-page__toolbar">{children}</div>;
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

  return (
    <section className={`m-panel${spills ? ' is-spilling' : ''}`} ref={box}>
      {head && (
        <div className="m-panel__head" ref={bar}>
          {head}
        </div>
      )}
      {children}
    </section>
  );
}

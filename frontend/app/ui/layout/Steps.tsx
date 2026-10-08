import type { ReactNode } from 'react';

import './steps.css';

export function Step({
  n,
  title,
  aside,
  children,
}: {
  n?: number;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="m-nstep">
      <header className="m-nstep__head">
        {n != null && (
          <span className="m-nstep__n" aria-hidden="true">
            {n}
          </span>
        )}
        <h2 className="m-nstep__title">{title}</h2>
        {aside && <div className="m-nstep__aside">{aside}</div>}
      </header>
      <div className="m-nstep__body">{children}</div>
    </section>
  );
}

export function StepLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="m-nstep__link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

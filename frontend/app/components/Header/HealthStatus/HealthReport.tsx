import { SUPPORT_GLYPHS } from '@/ui/brand/support-glyphs';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import {
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  CircleCheck,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'Shared/SupportMenu/support-menu.css';

import type { IServiceStats } from './HealthStatus';
import './health.css';

export interface HealthResponse {
  overallHealth: boolean;
  healthMap: Record<string, IServiceStats>;
  details?: Record<string, any>;
}

/** Every service group, opened on the ones that fail. */
export function HealthReport({
  report,
  loading,
}: {
  report: HealthResponse | null;
  loading: boolean;
}) {
  const { t } = useTranslation();
  // the failing ones first: the one that is down leads its list
  const services = Object.entries(report?.healthMap ?? {}).sort(
    ([, a], [, b]) => Number(a.healthOk) - Number(b.healthOk),
  );
  const [open, setOpen] = React.useState<string[]>([]);

  React.useEffect(() => {
    setOpen(services.filter(([, s]) => !s.healthOk).map(([k]) => k));
  }, [report]);

  if (loading && !report) return <SkeletonRows rows={4} columns={[100]} />;
  if (!services.length)
    return (
      <p className="text-sm text-content-muted">
        {t('Could not reach the health endpoint.')}
      </p>
    );

  return (
    // a recheck keeps the last answer on screen, dimmed, so nothing jumps
    <div className={`m-health${loading ? ' is-checking' : ''}`}>
      {services.map(([key, svc]) => {
        const isOpen = open.includes(key);
        const subs = (
          Object.entries(svc.subservices ?? {}) as [
            string,
            {
              health: boolean;
              details?: { errors?: string[]; version?: string };
            },
          ][]
        ).sort(([, a], [, b]) => Number(!!a?.health) - Number(!!b?.health));
        return (
          <div key={key} className={`m-health__svc${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="m-health__row"
              aria-expanded={isOpen}
              onClick={() =>
                setOpen((o) =>
                  o.includes(key) ? o.filter((k) => k !== key) : [...o, key],
                )
              }
            >
              {svc.healthOk ? (
                <CircleCheck size={15} className="m-health__ok" />
              ) : (
                <CircleAlert size={15} className="m-health__bad" />
              )}
              <span className="m-health__name">{svc.name ?? key}</span>
              <ChevronRight size={14} className="m-health__chev" />
            </button>
            {isOpen && (
              <div className="m-health__subs">
                {subs.map(([name, sub]) => (
                  <div key={name} className="m-health__sub">
                    <span className="m-health__sub-head">
                      <i
                        className={`m-health__dot${sub?.health ? '' : ' is-bad'}`}
                        aria-label={sub?.health ? t('Healthy') : t('Failing')}
                      />
                      <span className="m-health__sub-name m-truncate">
                        {name}
                      </span>
                      {sub?.details?.version && (
                        <span className="m-health__version">
                          {sub.details.version}
                        </span>
                      )}
                    </span>
                    {sub?.details?.errors?.length ? (
                      <span className="m-health__err">
                        {sub.details.errors.join(', ')}
                      </span>
                    ) : !sub?.health ? (
                      <span className="m-health__err">
                        {t('Service not responding')}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const LINKS: {
  href: string;
  label: string;
  hint: string;
  glyph: keyof typeof SUPPORT_GLYPHS;
}[] = [
  {
    href: 'https://docs.openreplay.com/en/troubleshooting/',
    label: 'Troubleshooting guide',
    hint: 'docs.openreplay.com',
    glyph: 'docs',
  },
  {
    href: 'https://slack.openreplay.com/',
    label: 'Ask the community',
    hint: 'Slack',
    glyph: 'slack',
  },
  {
    href: 'https://github.com/openreplay/openreplay/issues/new/choose',
    label: 'Raise an issue',
    hint: 'GitHub',
    glyph: 'github',
  },
];

/** The ways out when a service will not answer: the support menu's rows. */
export function HealthLinks() {
  const { t } = useTranslation();
  return (
    <nav
      className="m-health__links"
      aria-label={t('Help with the installation')}
    >
      {LINKS.map((l) => {
        const g = SUPPORT_GLYPHS[l.glyph];
        return (
          <a
            key={l.href}
            className="m-support__row m-health__link"
            href={l.href}
            target="_blank"
            rel="noreferrer"
          >
            <svg
              className="m-support__glyph"
              viewBox={g.viewBox}
              aria-hidden="true"
            >
              <path d={g.d} fill="currentColor" />
            </svg>
            <span className="m-support__text">
              <span className="m-support__label">{t(l.label)}</span>
              <span className="m-support__hint">{l.hint}</span>
            </span>
            <ArrowUpRight
              size={13}
              strokeWidth={1.75}
              className="m-support__out"
              aria-hidden="true"
            />
          </a>
        );
      })}
    </nav>
  );
}

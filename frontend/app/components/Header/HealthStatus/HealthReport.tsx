import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ChevronRight, CircleAlert, CircleCheck } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
  const services = Object.entries(report?.healthMap ?? {});
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
    <div className="m-health">
      {services.map(([key, svc]) => {
        const isOpen = open.includes(key);
        const subs = Object.entries(svc.subservices ?? {}) as [
          string,
          {
            health: boolean;
            details?: { errors?: string[]; version?: string };
          },
        ][];
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

const LINKS = [
  {
    href: 'https://docs.openreplay.com/en/troubleshooting/',
    label: 'Troubleshooting guide',
  },
  { href: 'https://slack.openreplay.com/', label: 'Ask the Slack community' },
  {
    href: 'https://github.com/openreplay/openreplay/issues/new/choose',
    label: 'Raise an issue',
  },
];

export function HealthLinks() {
  const { t } = useTranslation();
  return (
    <div className="m-health__links">
      {LINKS.map((l) => (
        <a
          key={l.href}
          className="m-health__link"
          href={l.href}
          target="_blank"
          rel="noreferrer noopener"
        >
          {t(l.label)}
        </a>
      ))}
    </div>
  );
}

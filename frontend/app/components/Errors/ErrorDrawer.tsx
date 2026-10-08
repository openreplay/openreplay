import { Button } from '@/ui/actions/button';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { Segmented } from '@/ui/inputs/toggle-group';
import { DrawerHeader, Section } from '@/ui/overlays/EntityDrawer';
import { Tooltip } from '@/ui/overlays/tooltip';
import { RESOLVED } from 'Types/errorInfo';
import { FilterKey } from 'Types/filter/filterType';
import { Search } from 'lucide-react';
import { DateTime } from 'luxon';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { countries } from 'App/constants';
import { useStore } from 'App/mstore';
import { sessions as sessionsRoute } from 'App/routes';
import { useNavigate } from 'App/routing';
import TrendChart from 'Components/Charts/TrendChart';

import {
  SessionsTable,
  type SessionsTableProps,
} from 'Shared/SessionsTable/SessionsTable';
import { useOpenSession } from 'Shared/SessionsTable/useOpenSession';

import StackTrace from './StackTrace';
import './error-drawer.css';

type SessionRow = SessionsTableProps['rows'][number];

const fmt = (n: number) => (n ?? 0).toLocaleString();
const SESSION_FIELDS = [
  'started',
  'duration',
  'events',
  'location',
  'device',
] as const;

interface Tag {
  name: string;
  partitions: { name: string; count: number }[];
}

interface Partition {
  label: string;
  prc: number;
}

/* Values past the first four collapse into "Other" once they fall under 3%. */
function partitionsOf(
  partitions: { name: string; count: number }[] = [],
  country: boolean,
  other: string,
): Partition[] {
  const sum = partitions.reduce((a, p) => a + Number(p.count), 0);
  if (!sum) return [];
  const sorted = [...partitions].sort((a, b) => b.count - a.count);
  const shown: Partition[] = [];
  let rest = 0;
  sorted.forEach((p, i) => {
    const prc = (p.count / sum) * 100;
    if (i < 4 || (i < 10 && prc >= 3)) {
      shown.push({
        label: country ? countries[p.name] || 'Unknown' : p.name,
        prc,
      });
    } else rest += prc;
  });
  if (rest > 0) shown.push({ label: other, prc: rest });
  return shown;
}

/** One JS error, opened from a console row, a timeline marker or the errors card. */
function ErrorDrawer({ errorId }: { errorId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hideModal } = useModal();
  const { errorStore, searchStore, filterStore } = useStore();
  const { open, hover } = useOpenSession();
  const [range, setRange] = React.useState<'24h' | '30d'>('30d');
  const error = errorStore.instance;

  React.useEffect(() => {
    if (errorId) void errorStore.fetchErrorDetails(errorId);
  }, [errorId]);

  const findSessions = () => {
    if (!error) return;
    const errorFilter = filterStore.findEvent({ name: FilterKey.ERROR_EVENT });
    const nameLabel = filterStore.findEvent({ name: 'name' });
    if (errorFilter && nameLabel) {
      searchStore.resetFilters();
      nameLabel.value = [error.name];
      errorFilter.filters = [nameLabel];
      searchStore.addFilter(errorFilter);
    }
    navigate(sessionsRoute());
  };

  const chart = React.useMemo(() => {
    const rows: { timestamp: number; count: number }[] =
      (range === '24h' ? error?.chart24 : error?.chart30) ?? [];
    const label = t('Sessions');
    return {
      chart: rows.map((r) => ({
        time: DateTime.fromMillis(r.timestamp).toFormat(
          range === '24h' ? 'HH:mm' : 'LLL d',
        ),
        [label]: r.count,
      })),
      namesMap: [label],
    };
  }, [error, range, t]);

  const breakdown = React.useMemo(
    () =>
      ((error?.tags ?? []) as unknown as Tag[])
        .map(({ name, partitions }) => ({
          name,
          partitions: partitionsOf(partitions, name === 'country', t('Other')),
        }))
        .filter((tag) => tag.partitions.length > 0),
    [error, t],
  );

  if (!error?.errorId) {
    return (
      <div className="m-drawer__pane">
        <header className="m-drawer__head">
          <DrawerHeader title={t('JS error')} onClose={hideModal} />
        </header>
        <div className="m-drawer__body">
          {errorStore.isLoadingError ? (
            <div className="px-6 py-5">
              <SkeletonRows rows={6} />
            </div>
          ) : (
            <EmptyState
              title={t('This error is no longer available')}
              hint={t('It may have been resolved and cleaned up.')}
            />
          )}
        </div>
      </div>
    );
  }

  const session = error.lastHydratedSession;
  const resolved = error.status === RESOLVED;

  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <DrawerHeader
          title={error.name}
          onClose={hideModal}
          meta={
            <span className="m-errd__facts">
              {error.stack0InfoString && (
                <span className="m-mono m-errd__source">
                  {error.stack0InfoString}
                </span>
              )}
              <span>
                {t('{{sessions}} sessions · {{users}} users', {
                  sessions: fmt(error.sessions),
                  users: fmt(error.users),
                })}
              </span>
              <span>
                {t('First seen')} <RelativeTime at={error.firstOccurrence} /> ·{' '}
                {t('last seen')} <RelativeTime at={error.lastOccurrence} />
              </span>
              {resolved && <span>{t('Resolved')}</span>}
            </span>
          }
        />
      </header>
      <div className="m-drawer__body">
        <Section title={t('Message')}>
          <p className="m-errd__message m-mono">{error.message}</p>
        </Section>

        {error.customTags.length > 0 && (
          <Section
            title={t('Custom tags')}
            hint={t('From the most recent occurrence.')}
          >
            <dl className="m-errd__tags">
              {(error.customTags as unknown as Record<string, string>[]).map(
                (tag) => {
                  const [key, value] = Object.entries(tag)[0];
                  return (
                    <React.Fragment key={key}>
                      <dt>{key}</dt>
                      <dd className="m-mono">{String(value)}</dd>
                    </React.Fragment>
                  );
                },
              )}
            </dl>
          </Section>
        )}

        <Section
          title={t('Occurrences')}
          hint={t('Sessions with this error.')}
          action={
            <Segmented
              ariaLabel={t('Period')}
              value={range}
              onChange={(v) => setRange(v as '24h' | '30d')}
              options={[
                { value: '24h', label: t('24 hours') },
                { value: '30d', label: t('30 days') },
              ]}
            />
          }
        >
          <div className="m-errd__chart">
            <TrendChart
              data={chart}
              viewType="barChart"
              height={140}
              label={t('Sessions')}
            />
          </div>
        </Section>

        <StackTrace
          name={error.name}
          message={error.message}
          frames={errorStore.instanceTrace}
          loading={errorStore.isLoadingTrace}
          sourcemapUploaded={errorStore.sourcemapUploaded}
        />

        {breakdown.length > 0 && (
          <Section
            title={t('Breakdown')}
            hint={t('Where it happens, over the last 30 days.')}
          >
            <div className="m-errd__dists">
              {breakdown.map((tag) => (
                <Distribution key={tag.name} {...tag} />
              ))}
            </div>
          </Section>
        )}

        <Section
          title={t('Last session')}
          hint={t('The most recent session that hit this error.')}
          action={
            <Button variant="subtle" size="sm" onClick={findSessions}>
              <Search size={14} />
              {t('Find all sessions')}
            </Button>
          }
          flush
        >
          <div className="m-errd__sessions">
            {session?.sessionId ? (
              <SessionsTable
                rows={[session as unknown as SessionRow]}
                fields={SESSION_FIELDS}
                onOpen={open}
                onHover={hover}
                liveBadge={false}
                stickyHeader={false}
              />
            ) : (
              <p className="m-errd__none">
                {t('No recorded session for this error yet.')}
              </p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Distribution({
  name,
  partitions,
}: {
  name: string;
  partitions: Partition[];
}) {
  const { t } = useTranslation();
  const top = partitions[0];
  const title =
    (
      {
        browser: t('Browser'),
        os: t('OS'),
        country: t('Country'),
        device: t('Device'),
      } as Record<string, string>
    )[name] ?? name;
  return (
    <div className="m-errd__dist">
      <div className="m-errd__dist-head">
        <span className="m-errd__dist-name">{title}</span>
        <span className="m-errd__dist-top m-truncate">{top.label}</span>
        <span className="tabular-nums">{Math.round(top.prc)}%</span>
      </div>
      <div className="m-errd__bar">
        {partitions.map((p, i) => (
          <Tooltip
            key={p.label}
            title={`${p.label} · ${Math.round(p.prc)}%`}
            delay={100}
          >
            <span
              style={{
                width: `${p.prc}%`,
                background: `var(--m-chart-${(i % 8) + 1})`,
              }}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

export default observer(ErrorDrawer);

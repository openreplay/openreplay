import { RelativeTime } from '@/ui/data/RelativeTime';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DateRange } from '@/ui/inputs/DateRange';
import { ListFooter } from '@/ui/layout/ListFooter';
import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import { useQuery } from '@tanstack/react-query';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import type Session from 'Types/session';
import { Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { durationFormatted } from 'App/date';
import { useStore } from 'App/mstore';
import { filterMap } from 'App/mstore/searchStore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { FilterKey } from 'App/types/filter/filterType';

import './user-sessions.css';

const PER_PAGE = 10;

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  name: string;
}

/** Every recording of one identified user. */
function UserSessionsDrawer({ open, onClose, userId, name }: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const { sessionStore, filterStore, projectsStore, settingsStore } =
    useStore();
  const siteId = projectsStore.activeSiteId;
  const timezone = settingsStore.sessionSettings.timezone?.value;
  const [period, setPeriod] = React.useState(() =>
    Period({ rangeName: LAST_7_DAYS }),
  );
  const [page, setPage] = React.useState(1);
  const { start, end } = period;

  const { data, isPending } = useQuery<{ sessions: Session[]; total: number }>({
    queryKey: ['user-sessions', siteId, userId, start, end, page],
    enabled: open && !!userId,
    queryFn: () => {
      const userFilter = filterStore.findEvent({
        name: FilterKey.USERID,
        category: 'user',
      });
      if (!userFilter) return Promise.resolve({ sessions: [], total: 0 });
      userFilter.value = [userId];
      return sessionStore.getSessions({
        startTimestamp: start,
        endTimestamp: end,
        filters: [filterMap(userFilter)],
        page,
        limit: PER_PAGE,
        eventsOrder: 'then',
      });
    },
  });
  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;

  const watch = (s: Session, e: React.MouseEvent) => {
    const path = withSiteId(sessionRoute(s.sessionId), siteId!);
    if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(path, '_blank');
    else {
      onClose();
      history.push(path);
    }
  };

  return (
    <EntityDrawer
      size="wide"
      open={open}
      onClose={onClose}
      eyebrow={t('Sessions')}
      title={name}
      meta={
        data ? (
          <span>
            {total === 1
              ? t('1 recording')
              : t('{{n}} recordings', { n: total.toLocaleString() })}
          </span>
        ) : undefined
      }
    >
      <div className="m-psess__tools">
        <DateRange
          field={t('Started')}
          period={period}
          onChange={(p) => {
            setPeriod(p);
            setPage(1);
          }}
        />
      </div>
      {isPending ? (
        <SkeletonRows rows={4} columns={[70, 30]} />
      ) : sessions.length === 0 ? (
        <EmptyState
          art="range"
          title={t('No recordings found')}
          hint={t('Nothing from this person in the window. Widen it.')}
        />
      ) : (
        <>
          <ul className="m-psess">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <button
                  type="button"
                  className="m-psess__row"
                  onClick={(e) => watch(s, e)}
                >
                  <Play
                    size={14}
                    className="m-psess__play"
                    aria-hidden="true"
                  />
                  <span className="m-psess__main">
                    <span className="m-psess__line">
                      <RelativeTime at={s.startedAt ?? 0} timezone={timezone} />
                      {' · '}
                      {durationFormatted(s.duration)}
                    </span>
                    <span className="m-psess__sub m-truncate">
                      {[
                        [s.userBrowser, s.userOs]
                          .filter(Boolean)
                          .join(t(' on ')),
                        [s.userCity, s.userCountry].filter(Boolean).join(', '),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="m-psess__figs">
                    <span>{t('{{n}} events', { n: s.eventsCount })}</span>
                    <span>{t('{{n}} pages', { n: s.pagesCount })}</span>
                    <span>{t('{{n}} errors', { n: s.errorsCount ?? 0 })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <ListFooter
            page={page}
            pageSize={PER_PAGE}
            total={total}
            noun={[t('session'), t('sessions')]}
            onPage={setPage}
          />
        </>
      )}
    </EntityDrawer>
  );
}

export default observer(UserSessionsDrawer);

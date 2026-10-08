import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { DateRange } from '@/ui/inputs/DateRange';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PagePanel } from '@/ui/layout/PageCard';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import { useQuery } from '@tanstack/react-query';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { ChevronRight, EyeOff, Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { formatTs, tsToCheckRecent } from 'App/date';
import { useStore } from 'App/mstore';
import type Event from 'App/mstore/types/Analytics/Event';
import { getLocalHourFormat } from 'App/utils/intlUtils';
import EventDetailsDrawer from 'Components/DataManagement/Activity/EventDetailsDrawer';
import { getEventIcon } from 'Components/DataManagement/Activity/getEventIcon';

import UserSessionsDrawer from 'Shared/UserSessionsDrawer';

const LIMIT = 50;

function UserActivity({ userId, name }: { userId: string; name: string }) {
  const { t } = useTranslation();
  const { analyticsStore, filterStore, projectsStore } = useStore();
  const [page, setPage] = React.useState(1);
  const [period, setPeriod] = React.useState(() =>
    Period({ rangeName: LAST_7_DAYS }),
  );
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [typeQuery, setTypeQuery] = React.useState('');
  const [openEvent, setOpenEvent] = React.useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = React.useState(false);

  const eventTypes = filterStore
    .getCurrentProjectFilters()
    .filter((f) => f.isEvent)
    .map((f) => ({ key: f.name, title: f.displayName ?? f.name }));
  const shownTypes = eventTypes.filter(
    (e) =>
      !typeQuery || e.title.toLowerCase().includes(typeQuery.toLowerCase()),
  );

  const { data, isPending } = useQuery({
    // the same user id can exist in two projects: the key carries the project
    queryKey: [
      'user-events',
      projectsStore.activeSiteId,
      userId,
      period.start,
      period.end,
      hidden,
      page,
    ],
    queryFn: () =>
      analyticsStore.fetchUserEvents(
        userId,
        'desc',
        period,
        hidden,
        page,
        LIMIT,
      ),
  });
  const events = data?.events ?? [];
  const total = data?.total ?? 0;

  const days = events.reduce<{ key: string; events: Event[] }[]>((acc, ev) => {
    const key = tsToCheckRecent(ev.created_at, 'LLL dd, yyyy');
    const last = acc[acc.length - 1];
    if (last?.key === key) last.events.push(ev);
    else acc.push({ key, events: [ev] });
    return acc;
  }, []);

  const toggleType = (key: string) => {
    setHidden((h) =>
      h.includes(key) ? h.filter((k) => k !== key) : [...h, key],
    );
    setPage(1);
  };

  return (
    <PagePanel
      head={
        <div className="m-person__acthead">
          <span className="m-ditem__head-title">{t('Activity')}</span>
          <Button variant="subtle" onClick={() => setSessionsOpen(true)}>
            <Play size={13} />
            {t('Play sessions')}
          </Button>
          <div className="m-page__controls">
            <PopoverPanel
              placement="bottomRight"
              content={
                <div className="m-person__types">
                  <PopoverSearch
                    placeholder={t('Search event types')}
                    value={typeQuery}
                    onChange={setTypeQuery}
                  />
                  <div className="m-person__types-list">
                    {shownTypes.map((e) => (
                      <CheckRow
                        key={e.key}
                        on={!hidden.includes(e.key)}
                        onToggle={() => toggleType(e.key)}
                      >
                        {e.title}
                      </CheckRow>
                    ))}
                  </div>
                  {hidden.length > 0 && (
                    <div className="m-person__types-foot">
                      <Button
                        variant="subtle"
                        onClick={() => {
                          setHidden([]);
                          setPage(1);
                        }}
                      >
                        {t('Show all')}
                      </Button>
                    </div>
                  )}
                </div>
              }
            >
              <span>
                <IconButton
                  icon={<EyeOff size={14} />}
                  label={t('Hide events')}
                  count={hidden.length}
                  active={hidden.length > 0}
                />
              </span>
            </PopoverPanel>
            <DateRange
              field={t('Occurred')}
              period={period}
              onChange={(p) => {
                setPeriod(p);
                setPage(1);
              }}
            />
          </div>
        </div>
      }
    >
      {isPending ? (
        <SkeletonRows rows={6} columns={[15, 85]} />
      ) : events.length === 0 ? (
        <EmptyState
          title={t('No events in this window')}
          hint={
            hidden.length
              ? t('Widen the date range, or show the event types you hid.')
              : t('Widen the date range to see older activity.')
          }
        />
      ) : (
        <div className="m-ptl">
          {days.map((d) => (
            <div key={d.key}>
              <div className="m-ptl__day">{d.key}</div>
              {d.events.map((e) => (
                <button
                  key={e.event_id}
                  type="button"
                  className="m-ptl__row"
                  onClick={() => setOpenEvent(e.event_id)}
                >
                  <span className="m-ptl__time">
                    {formatTs(e.created_at, getLocalHourFormat())}
                  </span>
                  <span className="m-ptl__icon">
                    {getEventIcon(e.isAutoCapture, e.event_name, 12)}
                  </span>
                  <span className="m-ptl__name m-truncate">
                    {filterStore.getFilterDisplayName(e.event_name)}
                  </span>
                  <span className="m-ptl__env">{e.environment}</span>
                  <ChevronRight
                    size={13}
                    className="m-ptl__chev"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          ))}
          {total > LIMIT && (
            <ListFooter
              page={page}
              pageSize={LIMIT}
              total={total}
              noun={[t('event'), t('events')]}
              onPage={setPage}
            />
          )}
        </div>
      )}
      <EventDetailsDrawer
        eventId={openEvent}
        onClose={() => setOpenEvent(null)}
      />
      <UserSessionsDrawer
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        userId={userId}
        name={name}
      />
    </PagePanel>
  );
}

export default observer(UserActivity);

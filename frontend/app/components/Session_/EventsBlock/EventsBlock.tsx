import { IconButton } from '@/ui/actions/IconButton';
import { mergeEventLists, sortEvents } from 'Types/session';
import { ListFilter } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { PanelBar } from 'Components/Session/ReplayScreen/PanelBar';
import 'Components/Session/ReplayScreen/activity-panel.css';

import ActivityRow from './ActivityRow';

interface IProps {
  setActiveTab: (tab?: string) => void;
}

function EventsBlock(_props: IProps) {
  const { t } = useTranslation();
  const { uiPlayerStore, sessionStore } = useStore();
  const session = sessionStore.current;
  const mixedEventsWithIssues = session.mixedEventsWithIssues;
  const incidents = session.incidents;
  const { filteredEvents } = sessionStore;
  const query = sessionStore.eventsQuery;
  const setEventFilter = sessionStore.setEventQuery;
  const [mouseOver, setMouseOver] = React.useState(false);
  const scroller = React.useRef<VListHandle>(null);
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const { store, player } = React.useContext(PlayerContext);

  const { time, tabStates, tabChangeEvents = [] } = store.get();

  const filteredLength = filteredEvents?.length || 0;

  const getEvents = () => {
    if (tabStates !== undefined) {
      tabChangeEvents.forEach((ev) => {
        const urlsList = tabStates[ev.tabId]?.urlsList || [];
        let found = false;
        let i = urlsList.length - 1;
        while (!found && i >= 0) {
          const item = urlsList[i];
          if (item.url && item.time <= ev.time) {
            found = true;
            ev.activeUrl = item.url.replace(/.*\/\/[^\/]*/, '');
          }
          i--;
        }
      });
    }

    const eventsWithIncidents = [
      ...(incidents ?? []),
      ...(mixedEventsWithIssues ?? []),
    ].sort(sortEvents);

    const allEvents = mergeEventLists(
      (filteredLength > 0 ? filteredEvents : eventsWithIncidents) as any[],
      tabChangeEvents,
    );
    const filteredCombinedEvents: any[] = [];
    for (const e of allEvents) {
      let shouldAdd = true;
      if (zoomEnabled) {
        if ('time' in e) {
          shouldAdd = e.time >= zoomStartTs && e.time <= zoomEndTs;
        } else {
          shouldAdd = false;
        }
      }
      if (shouldAdd && uiPlayerStore.showOnlySearchEvents) {
        shouldAdd = 'isHighlighted' in e ? !!e.isHighlighted : false;
      }
      if (shouldAdd && 'type' in e && e.type === 'TABCHANGE') {
        shouldAdd = !!e.fromTab;
      }

      if (shouldAdd) {
        filteredCombinedEvents.push(e);
      }
    }
    return filteredCombinedEvents;
  };

  const usedEvents = React.useMemo(
    () => getEvents(),
    [
      query,
      filteredLength,
      mixedEventsWithIssues,
      incidents,
      tabChangeEvents,
      uiPlayerStore.showOnlySearchEvents,
    ],
  );

  // runs every player tick: binary search over the time-sorted list (it used
  // to copy the list with the incidents appended again and scan it linearly)
  const currentTimeEventIndex = React.useMemo(() => {
    let lo = 0;
    let hi = usedEvents.length - 1;
    let found = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if ((usedEvents[mid]?.time ?? 0) <= time) {
        found = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return found;
  }, [usedEvents, time]);

  const scrollTop = () =>
    setTimeout(() => scroller.current?.scrollToIndex(0), 100);
  const write = (value: string) => {
    setEventFilter({ query: value });
    scrollTop();
  };

  React.useEffect(() => () => setEventFilter({ query: '' }), []);
  React.useEffect(() => {
    if (scroller.current && !mouseOver) {
      scroller.current.scrollToIndex(currentTimeEventIndex, {
        align: 'center',
      });
    }
  }, [currentTimeEventIndex]);

  const seek = React.useCallback((at: number) => player.jump(at), [player]);
  const searchedOnly = uiPlayerStore.showOnlySearchEvents;

  return (
    <div className="m-act" data-openreplay-masked>
      <PanelBar
        find={{
          value: query,
          onChange: write,
          placeholder: t('Find in activity'),
        }}
      >
        {uiPlayerStore.showSearchEventsSwitchButton && (
          <IconButton
            icon={<ListFilter size={13} />}
            label={
              searchedOnly
                ? t('Showing the searched events. Click for everything.')
                : t('Searched events only')
            }
            variant="ghost"
            pressed={searchedOnly}
            onClick={() => uiPlayerStore.setShowOnlySearchEvents(!searchedOnly)}
          />
        )}
      </PanelBar>
      {usedEvents.length === 0 ? (
        <p className="m-spanel__none">
          {query || searchedOnly
            ? t('Nothing in the activity matches that.')
            : t('Nothing recorded yet.')}
        </p>
      ) : (
        <div
          className="m-act__scroll"
          onMouseOver={() => setMouseOver(true)}
          onMouseLeave={() => setMouseOver(false)}
        >
          <VList
            data={usedEvents}
            className="m-act__list"
            ref={scroller}
            role="list"
            aria-label={t('Activity')}
          >
            {(event, i) => (
              <ActivityRow
                key={event.key ?? `${event.time}-${i}`}
                event={event}
                now={i === currentTimeEventIndex}
                ahead={event.time > time}
                isFirst={i === 0}
                onSeek={seek}
              />
            )}
          </VList>
        </div>
      )}
    </div>
  );
}

export default observer(EventsBlock);

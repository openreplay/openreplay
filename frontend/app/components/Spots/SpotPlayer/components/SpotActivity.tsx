import { TYPES } from 'Types/session/event';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PanelBar } from 'Components/Session/ReplayScreen/PanelBar';
import 'Components/Session/ReplayScreen/activity-panel.css';
import ActivityRow from 'Components/Session_/EventsBlock/ActivityRow';

import spotPlayerStore from '../spotPlayerStore';

function SpotActivity() {
  const { t } = useTranslation();
  const [q, setQ] = React.useState('');
  const events = React.useMemo(
    () =>
      [
        ...spotPlayerStore.locations.map((l) => ({
          ...l,
          type: TYPES.LOCATION,
          url: l.location,
        })),
        ...spotPlayerStore.clicks.map((c) => ({ ...c, type: TYPES.CLICK })),
      ].sort((a, b) => a.time - b.time),
    [spotPlayerStore.locations, spotPlayerStore.clicks],
  );
  const now = spotPlayerStore.time * 1000;
  const { index } = spotPlayerStore.getHighlightedEvent(
    spotPlayerStore.time,
    events,
  );
  const seek = React.useCallback(
    (time: number) => spotPlayerStore.setTime(time / 1000),
    [],
  );

  if (events.length === 0) {
    return <p className="m-spanel__none">{t('Nothing recorded yet.')}</p>;
  }
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? events.filter((e: any) =>
        [e.label, e.url, e.selector].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(needle),
        ),
      )
    : events;
  return (
    <div className="m-act">
      <PanelBar
        find={{ value: q, onChange: setQ, placeholder: t('Find in activity') }}
      />
      {shown.length === 0 ? (
        <p className="m-spanel__none">
          {t('Nothing in the activity matches that.')}
        </p>
      ) : null}
      <div className="m-act__scroll">
        <div className="m-act__list overflow-y-auto" role="list">
          {shown.map((event, i) => (
            <ActivityRow
              key={`${event.time}-${i}`}
              event={event}
              now={event === events[index]}
              ahead={event.time > now}
              isFirst={i === 0}
              onSeek={seek}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default observer(SpotActivity);

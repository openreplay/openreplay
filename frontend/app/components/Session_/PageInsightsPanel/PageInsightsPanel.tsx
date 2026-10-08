import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/inputs/select';
import { Tooltip } from '@/ui/overlays/tooltip';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { compareJsonObjects } from 'App/utils';
import 'Components/Session/ReplayScreen/activity-panel.css';
import 'Components/Session/ReplayScreen/side-panel.css';

const JUMP_OFFSET = 1000;
interface Props {
  setActiveTab: (tab: string) => void;
}

function PageInsightsPanel({ setActiveTab }: Props) {
  const { t } = useTranslation();
  const { sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
  const startTs = sessionStore.current.startedAt;
  const loading = sessionStore.loadingSessionData;
  const events = sessionStore.visitedEvents;
  const filters = sessionStore.insightsFilters;
  const { fetchSessionClickmap } = sessionStore;
  const { insights } = sessionStore;
  const getPathname = (url: string) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };

  const urlOptions = events.map(({ url, host }: any) => ({
    label: getPathname(url),
    value: url,
    host,
  }));

  const { player: Player, store } = React.useContext(PlayerContext);
  const { location: currentLocation } = store.get();
  const markTargets = (t: TFunction) => Player.markTargets(t);
  const matchedUrl = currentLocation
    ? urlOptions.find((opt) => opt.value === currentLocation)?.value
    : undefined;
  const defaultValue = matchedUrl || (urlOptions[0]?.value ?? '');
  const [insightsFilters, setInsightsFilters] = useState({
    ...filters,
    url: defaultValue,
  });
  const prevInsights = React.useRef<any>();

  useEffect(() => {
    markTargets(insights);
    return () => {
      markTargets(null);
    };
  }, [insights]);

  useEffect(() => {
    const changed = !compareJsonObjects(prevInsights.current, insightsFilters);
    if (!changed) {
      return;
    }

    if (urlOptions && urlOptions[0]) {
      const url = insightsFilters.url
        ? insightsFilters.url
        : urlOptions[0].value;
      Player.pause();
      void fetchSessionClickmap(sessionId, {
        ...insightsFilters,
        sessionId,
        url,
      });
    }
    prevInsights.current = insightsFilters;
    return () => {
      prevInsights.current = undefined;
    };
  }, [insightsFilters]);

  const onPageSelect = (value: any) => {
    const event = events.find((item) => item.url === value);
    Player.jump(event.timestamp - startTs + JUMP_OFFSET);
    Player.pause();
    setInsightsFilters({ ...insightsFilters, url: value });
  };

  return (
    <div className="m-feat">
      <div className="m-spanel__bar">
        <span className="m-spanel__note flex-none">{t('Page')}</span>
        <Select value={insightsFilters.url} onValueChange={onPageSelect}>
          <SelectTrigger className="min-w-0 flex-1" aria-label={t('Page')}>
            <SelectValue placeholder={t('Choose a page')} />
          </SelectTrigger>
          <SelectContent>
            {urlOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="m-mono">{o.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <p className="m-spanel__none">{t('Loading clicks…')}</p>
      ) : (
        <TargetsList />
      )}
    </div>
  );
}

const TargetsList = observer(() => {
  const { t } = useTranslation();
  const { store, player } = React.useContext(PlayerContext);
  const { markedTargets: targets, activeTargetIndex } = store.get();
  if (!targets || targets.length === 0) {
    return (
      <p className="m-spanel__none">
        {t('No clicks were recorded on this page.')}
      </p>
    );
  }
  return (
    <ol className="m-spanel__list" aria-label={t('Most clicked elements')}>
      {targets.map((target, index) => {
        const on = activeTargetIndex === index;
        return (
          <li
            key={index}
            className={`m-spanel__row m-cmap__row${on ? ' is-marked' : ''}`}
          >
            <button
              type="button"
              className="m-spanel__cell"
              onClick={() => player.setActiveTarget(index)}
              aria-pressed={on}
            >
              <Tooltip title={t('Rank of the most clicked element')}>
                <span className="m-cmap__rank m-mono">{index + 1}</span>
              </Tooltip>
              <span className="m-spanel__body">
                <span
                  className="m-spanel__label m-mono m-truncate"
                  title={target.selector}
                >
                  {target.selector}
                </span>
                {on ? (
                  <span className="m-spanel__sub">
                    {t('{{n}} clicks · {{p}}% of the page', {
                      n: target.count,
                      p: target.percent,
                    })}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
});

export default observer(PageInsightsPanel);

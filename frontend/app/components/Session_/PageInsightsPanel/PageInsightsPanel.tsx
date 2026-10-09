import { IconButton } from '@/ui/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Tooltip } from '@/ui/overlays/tooltip';
import { TYPES } from 'Types/session/event';
import { Check, Globe, MousePointerClick, Play, Zap } from 'lucide-react';
import { untracked } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { formatClock } from 'App/player-ui/clock';
import { PanelBar } from 'Components/Session/ReplayScreen/PanelBar';
import 'Components/Session/ReplayScreen/side-panel.css';

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

interface ClickRow {
  selector: string;
  name: string;
  n: number;
  /** the first click, ms into the session */
  at: number;
  rage: boolean;
}

/** One row per element clicked on `page`, most clicked first. */
function clicksOn(events: any[], page: string): ClickRow[] {
  const byEl = new Map<string, ClickRow>();
  let path: string | null = null;
  for (const e of events) {
    if (e.type === TYPES.LOCATION) path = pathOf(e.url);
    if (path !== page || !e.selector) continue;
    if (e.type !== TYPES.CLICK && e.type !== TYPES.CLICKRAGE) continue;
    const rage = e.type === TYPES.CLICKRAGE;
    const row = byEl.get(e.selector) ?? {
      selector: e.selector,
      name: e.label || e.targetContent || 'Element',
      n: 0,
      at: e.time,
      rage: false,
    };
    // a rage click is reported beside the clicks it is made of
    if (!rage) row.n += 1;
    else if (row.n === 0) row.n = e.count || 3;
    row.rage ||= rage;
    row.at = Math.min(row.at, e.time);
    byEl.set(e.selector, row);
  }
  return [...byEl.values()].sort((a, b) => b.n - a.n || a.at - b.at);
}

/** The click map: where on one page this session clicked, and how much. */
function PageInsightsPanel() {
  const { t } = useTranslation();
  const { sessionStore, uiPlayerStore } = useStore();
  const { player, store } = React.useContext(PlayerContext);
  const { location: currentLocation, playing } = store.get();
  const events: any[] = sessionStore.current.events ?? [];

  const locations = useMemo(
    () => events.filter((e) => e.type === TYPES.LOCATION),
    [events],
  );
  const pages = useMemo(
    () => [...new Set(locations.map((l) => pathOf(l.url)))],
    [locations],
  );
  // the player's location string isn't always a clean URL: the page is the
  // session's own location event at the playhead, re-read as the replay moves
  const currentPath = useMemo(() => {
    const at = untracked(() => store.get().time);
    let path = pages[0];
    for (const l of locations) {
      if (l.time > at) break;
      path = pathOf(l.url);
    }
    return path;
  }, [locations, pages, currentLocation, playing]);
  // the page is the playhead's until one is picked
  const [picked, setPicked] = useState<string | null>(null);
  const page = picked ?? currentPath ?? '/';
  const rows = useMemo(() => clicksOn(events, page), [events, page]);
  const total = rows.reduce((n, r) => n + r.n, 0);

  // the dots sit on the page's elements while it is paused there; playing
  // moves the page under them, so they go until it stops again
  const shown = !playing && currentPath === page && rows.length > 0;
  useEffect(() => {
    if (!shown) return undefined;
    player.markTargets(rows.map((r) => ({ selector: r.selector, count: r.n })));
    return () => player.markTargets(null);
  }, [shown, rows]);
  useEffect(() => () => uiPlayerStore.setClickMapHot(null), []);

  const pickPage = (p: string) => {
    setPicked(p);
    const first = locations.find((l) => pathOf(l.url) === p);
    if (first) {
      player.pause();
      player.jump(first.time);
    }
  };
  const playFrom = (at: number) => {
    player.jump(at);
    player.play();
  };

  return (
    <div
      className="m-feat m-cmap"
      onPointerLeave={() => uiPlayerStore.setClickMapHot(null)}
    >
      <PanelBar
        note={
          total === 0
            ? t('Nothing clicked on {{page}}', { page })
            : total === 1
              ? t('1 click on {{page}}', { page })
              : t('{{n}} clicks on {{page}}', { n: total, page })
        }
      >
        {pages.length > 1 && (
          <DropdownMenu>
            <Tooltip title={t('Another page from this session')}>
              <DropdownMenuTrigger asChild>
                <span>
                  <IconButton
                    icon={<Globe size={14} />}
                    label={t('Pick a page')}
                    variant="ghost"
                  />
                </span>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={pages.map((p) => ({
                  key: p,
                  label: p,
                  icon: p === page ? <Check size={13} /> : undefined,
                  onClick: () => pickPage(p),
                }))}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </PanelBar>
      {rows.length === 0 ? (
        <p className="m-spanel__none">
          {pages.length > 1
            ? t(
                'This page was looked at, not clicked. Pick another page from the bar.',
              )
            : t('This page was looked at, not clicked.')}
        </p>
      ) : (
        <ol className="m-spanel__list" aria-label={t('Most clicked elements')}>
          {rows.map((r) => (
            <li
              key={r.selector}
              className="m-spanel__row"
              onPointerEnter={() => uiPlayerStore.setClickMapHot(r.selector)}
              onFocus={() => uiPlayerStore.setClickMapHot(r.selector)}
            >
              <button
                type="button"
                className="m-spanel__cell"
                onClick={() => playFrom(r.at)}
                aria-label={t('{{name}}, {{n}} clicks, first at {{at}}', {
                  name: r.name,
                  n: r.n,
                  at: formatClock(r.at),
                })}
              >
                <span className="m-spanel__time">{r.n}×</span>
                <span className={`m-spanel__glyph${r.rage ? ' is-rage' : ''}`}>
                  {r.rage ? <Zap size={12} /> : <MousePointerClick size={12} />}
                </span>
                <span className="m-spanel__body">
                  <span className="m-spanel__line">
                    <span className="m-spanel__label m-truncate">{r.name}</span>
                    <span className="m-spanel__tail">{formatClock(r.at)}</span>
                  </span>
                  <span className="m-spanel__sub m-mono m-truncate">
                    {r.selector}
                  </span>
                </span>
              </button>
              <span className="m-spanel__verb">
                <Tooltip title={t('Play from the first click')}>
                  <span>
                    <IconButton
                      icon={<Play size={13} />}
                      label={t('Play from the first click')}
                      variant="ghost"
                      onClick={() => playFrom(r.at)}
                    />
                  </span>
                </Tooltip>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default observer(PageInsightsPanel);

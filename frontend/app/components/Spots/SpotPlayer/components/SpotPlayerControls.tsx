import { IconButton } from '@/ui/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { SPEED_OPTIONS } from 'Player/player/Player';
import {
  Check,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayingState } from 'App/player-ui';
import { SKIP_INTERVALS } from 'App/player-ui/clock';
import { formatClock } from 'App/player-ui/clock';
import 'Components/Session/ReplayScreen/replay-timeline.css';

import spotPlayerStore from '../spotPlayerStore';
import SpotTimeline from './SpotTimeline';

function SpotPlayerControls() {
  const { t } = useTranslation();
  const store = spotPlayerStore;
  const completed = store.state === PlayingState.Completed;

  const togglePlay = () => {
    if (completed) store.setTime(0);
    store.setIsPlaying(completed ? true : !store.isPlaying);
  };
  const skip = (dir: 1 | -1) =>
    store.setTime(
      Math.min(
        store.duration,
        Math.max(0, store.time + dir * store.skipInterval),
      ),
    );

  return (
    <div className="m-tl">
      <IconButton
        icon={
          store.isPlaying ? (
            <Pause size={15} />
          ) : completed ? (
            <RotateCcw size={15} />
          ) : (
            <Play size={15} />
          )
        }
        label={store.isPlaying ? t('Pause (Space)') : t('Play (Space)')}
        variant="ghost"
        onClick={togglePlay}
      />
      <span className="m-tl__clock m-mono">
        {formatClock(store.time * 1000)}
        <span className="m-tl__clock--total">
          {' / '}
          {formatClock(store.duration * 1000)}
        </span>
      </span>
      <SpotTimeline />
      <span className="m-rs__controls">
        <IconButton
          icon={<RotateCcw size={14} />}
          label={t('Back {{n}} seconds', { n: store.skipInterval })}
          variant="ghost"
          onClick={() => skip(-1)}
        />
        <IconButton
          icon={<RotateCw size={14} />}
          label={t('Forward {{n}} seconds', { n: store.skipInterval })}
          variant="ghost"
          onClick={() => skip(1)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span className="inline-flex">
              <IconButton
                icon={<Settings2 size={14} />}
                label={
                  store.playbackRate !== 1
                    ? t('Playback settings · {{list}}', {
                        list: `${store.playbackRate}×`,
                      })
                    : t('Playback settings')
                }
                variant="ghost"
              />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="m-tl__menu">
            <p className="m-tl__menu-head">{t('Speed')}</p>
            {SPEED_OPTIONS.map((s) => (
              <DropdownMenuItem
                key={s}
                role="menuitemradio"
                aria-checked={store.playbackRate === s}
                onSelect={(e) => {
                  e.preventDefault();
                  store.setPlaybackRate(s);
                }}
              >
                <span className="m-tl__menu-check">
                  {store.playbackRate === s && (
                    <Check size={12} aria-hidden="true" />
                  )}
                </span>
                <span className="m-mono">{s}×</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <p className="m-tl__menu-head">{t('Jump by')}</p>
            <div className="m-tl__menu-row">
              {Object.keys(SKIP_INTERVALS).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`m-tl__chip${Number(k) === store.skipInterval ? ' is-on' : ''}`}
                  onClick={() => store.setSkipInterval(Number(k))}
                >
                  {k}s
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton
          icon={
            store.isFullScreen ? (
              <Minimize2 size={14} />
            ) : (
              <Maximize2 size={14} />
            )
          }
          label={store.isFullScreen ? t('Exit full screen') : t('Full screen')}
          variant="ghost"
          onClick={() => store.setIsFullScreen(!store.isFullScreen)}
        />
      </span>
    </div>
  );
}

export default observer(SpotPlayerControls);

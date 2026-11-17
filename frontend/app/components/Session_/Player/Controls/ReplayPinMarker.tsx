import { Button } from '@/ui/actions/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/ui/overlays/popover';
import { Play, ScrollText } from 'lucide-react';
import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useNavigate } from 'App/routing';
import { PlayerContext } from 'Components/Session/playerContext';

import { getTimelinePosition } from './getTimelinePosition';

/** the replay opens, and plays from, this long before the moment */
const PIN_LEAD = 5_000;
const PEEK_MS = 3_500;
const clock = (ms: number) =>
  Duration.fromMillis(Math.max(0, ms)).toFormat('m:ss');

/** The log line that opened this replay, on the track once it has loaded. */
function ReplayPinMarker({ scale }: { scale: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionStore } = useStore();
  const { player, store } = useContext(PlayerContext);
  const { time, playing, ready } = store.get();
  const pin = sessionStore.replayPin;
  const { sessionId, startedAt } = sessionStore.current;
  const at = pin ? pin.at - (startedAt ?? 0) : 0;

  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [pulse, setPulse] = useState(0);
  const prev = useRef(time);
  const timer = useRef(0);
  useEffect(() => {
    const was = prev.current;
    prev.current = time;
    if (playing && was < at && time >= at) {
      setPulse((n) => n + 1);
      setPeek(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPeek(false), PEEK_MS);
    }
  }, [time, playing, at]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // a queued session keeps the screen mounted: the pin is only its own
  if (!pin || !ready || String(pin.sessionId) !== String(sessionId))
    return null;
  const from = Math.max(0, at - PIN_LEAD);
  const reached = time >= at;
  const shown = open || peek;
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <Popover
      open={shown}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPeek(false);
      }}
    >
      <PopoverAnchor asChild>
        <button
          type="button"
          key={pulse}
          className={`m-tl__pin${pin.tone ? ` is-${pin.tone}` : ''}${reached ? ' is-reached' : ''}${pulse ? ' is-pulsing' : ''}${shown ? ' is-open' : ''}`}
          style={{ left: `${getTimelinePosition(at, scale)}%` }}
          aria-label={t('Log line at {{at}}: {{label}}', {
            at: clock(at),
            label: pin.label,
          })}
          aria-expanded={open}
          onPointerDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            window.clearTimeout(timer.current);
            setPeek(false);
            setOpen((o) => !o);
          }}
        >
          <ScrollText size={10} aria-hidden="true" />
        </button>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="m-tl__pincard"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // the track under it seeks and pauses on any press
        onPointerDown={stop}
        onPointerUp={stop}
        onPointerMove={stop}
        onClick={stop}
      >
        <div className="m-tl__pincard-head">
          <span
            className={`m-tl__pincard-dot${pin.tone ? ` is-${pin.tone}` : ''}`}
            aria-hidden="true"
          />
          <span className="m-tl__pincard-kind">{t('Log line')}</span>
          <span className="m-tl__pincard-at m-mono">
            {t('at {{at}}', { at: clock(at) })}
          </span>
          {pin.detail && (
            <span className="m-tl__pincard-detail m-truncate">
              {pin.detail}
            </span>
          )}
        </div>
        <p className="m-tl__pincard-msg">{pin.label}</p>
        <div className="m-tl__pincard-actions">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              player.jump(from);
              player.play();
              setOpen(false);
              setPeek(false);
            }}
          >
            <Play size={12} aria-hidden="true" />
            {t('Play from {{at}}', { at: clock(from) })}
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => navigate(pin.backUrl)}
          >
            {t('Open in Logs')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default observer(ReplayPinMarker);

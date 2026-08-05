import { Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'Components/Session/playerContext';

import { type IssueSessionCard, TagChip } from '../shared';

const STEP_BLUE = '#394EFF';
const RAIL = '#A7BFFF';
const RAIL_LEAD = 14;

const fmtTime = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

/* One step row. Memoized on purpose: the parent re-renders on every player time
   tick (that's how the highlight tracks the playhead), and only ONE row's
   `active` actually changes per tick — without this the whole timeline
   re-renders at playback framerate. `onJump` must stay referentially stable for
   the memo to hold, hence the useCallback in the parent. */
const Step = React.memo(function Step({
  name,
  ms,
  first,
  last,
  active,
  onJump,
}: {
  name: string;
  ms: number;
  first: boolean;
  last: boolean;
  active: boolean;
  onJump: (ms: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="button"
      tabIndex={0}
      title={t('Jump to {{time}}', { time: fmtTime(ms) })}
      onClick={() => onJump(ms)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onJump(ms);
        }
      }}
      className="group flex gap-2.5 -mx-2 px-2 rounded cursor-pointer transition-colors hover:bg-active-blue"
      style={{ background: active ? 'var(--color-active-blue)' : undefined }}
    >
      <div className="flex flex-col items-center shrink-0" style={{ width: 7 }}>
        <span
          style={{
            height: RAIL_LEAD,
            width: 1,
            background: first ? 'transparent' : RAIL,
          }}
        />
        <span
          style={{
            width: active ? 8 : 6,
            height: active ? 8 : 6,
            borderRadius: 9999,
            background: STEP_BLUE,
            boxShadow: active ? '0 0 0 3px rgba(57,78,255,0.18)' : undefined,
          }}
        />
        {!last && (
          <span
            style={{ flex: 1, width: 1, minHeight: 8, background: RAIL }}
          />
        )}
      </div>
      <div className="py-2 flex items-baseline justify-between gap-2 min-w-0 flex-1">
        <span
          style={{
            fontSize: 13,
            lineHeight: 1.45,
            color: 'var(--color-gray-dark)',
            fontWeight: active ? 500 : 400,
          }}
        >
          {name}
        </span>
        <span
          className="shrink-0 flex items-center gap-1 tabular-nums"
          style={{ fontSize: 11, color: 'var(--color-gray-medium)' }}
        >
          <Play
            size={9}
            strokeWidth={0}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            style={{ fill: STEP_BLUE }}
          />
          {fmtTime(ms)}
        </span>
      </div>
    </div>
  );
});

/* The session's journey. With real per-step timings from the backend
   (`card.journeySteps`, GET …/journey / search) it's a clickable step timeline —
   each step seeks the player to its moment, and the step at the current playhead
   is highlighted. Falls back to the single journey block when a session has no
   steps (aged past the 1-month TTL, or never vision-processed). */
const JourneyView = observer(({ card }: { card?: IssueSessionCard }) => {
  const { t } = useTranslation();
  const { player, store } = React.useContext(PlayerContext);
  const nowMs: number = (store?.get?.() as any)?.time ?? 0;
  const jump = React.useCallback((ms: number) => player?.jump(ms), [player]);

  const steps = card?.journeySteps ?? [];
  const journey = card?.journey?.trim();
  const tags = card?.tags ?? [];

  if (steps.length === 0 && !journey && tags.length === 0) return null;

  // ---- stepped timeline (real timings) ----
  if (steps.length > 0) {
    // -1 until the playhead actually reaches step 0, so nothing is highlighted
    // during the lead-in rather than step 0 claiming time it didn't happen in
    let current = -1;
    steps.forEach((s, i) => {
      if (nowMs >= s.relativeTimestamp - 500) current = i;
    });
    return (
      <div className="flex flex-col">
        {steps.map((s, i) => (
          <Step
            key={`${s.name}-${i}`}
            name={s.name}
            ms={s.relativeTimestamp}
            first={i === 0}
            last={i === steps.length - 1}
            active={i === current}
            onJump={jump}
          />
        ))}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3 ml-4">
            {tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- fallback: single journey block (no steps for this session) ----
  return (
    <div className="flex gap-2.5">
      <div
        className="flex flex-col items-center shrink-0 pt-2"
        style={{ width: 7 }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: STEP_BLUE,
          }}
        />
      </div>
      <div className="py-1 flex flex-col items-start gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => player?.jump(0)}
          title={t('Jump to start')}
          className="tabular-nums cursor-pointer"
          style={{ fontSize: 11, color: 'var(--color-gray-medium)' }}
        >
          0:00
        </button>
        {journey && (
          <span
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--color-gray-dark)',
            }}
          >
            {journey}
          </span>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default JourneyView;

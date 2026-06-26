import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'Components/Session/playerContext';

import { type IssueSessionCard, TagChip } from '../shared';

const STEP_BLUE = '#394EFF';

/* The journey as a single point on the timeline (00:00) with the full journey
   text and its tags below. The per-step timeline is parked at the bottom of
   this file (BACKEND-PENDING) — it needs real per-step timings the backend
   doesn't return yet, so for now the journey is a single block. */
const JourneyView = observer(({ card }: { card?: IssueSessionCard }) => {
  const { t } = useTranslation();
  const { player } = React.useContext(PlayerContext);
  const journey = card?.journey?.trim();
  const tags = card?.tags ?? [];
  if (!journey && tags.length === 0) return null;

  // single point — time is a placeholder until the backend provides timings
  const seekStart = () => player?.jump(0);

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
          onClick={seekStart}
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
            {tags.map((t) => (
              <TagChip key={t} label={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default JourneyView;

// BACKEND-PENDING: per-step journey timeline. The journey is a single sentence
// today and we have no real per-step timings, so this fabricates them. Restore
// it (and the `Play` lucide import) once the backend returns ordered steps with
// timestamps.
//
// const RAIL = '#A7BFFF';
// const RAIL_LEAD = 14;
//
// function toJourneySteps(journey: string): string[] {
//   if (!journey) return [];
//   return journey
//     .replace(/\.+$/, '')
//     .split(/,\s*/)
//     .map((s) => s.replace(/^(and then|and|then)\s+/i, '').trim())
//     .filter(Boolean)
//     .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
// }
//
// function spreadTagsOverSteps(
//   stepCount: number,
//   tags: string[],
// ): Record<number, string> {
//   const map: Record<number, string> = {};
//   const m = tags.length;
//   if (!m || !stepCount) return map;
//   tags.forEach((tag, i) => {
//     const pos =
//       m === 1 ? stepCount - 1 : Math.round((i * (stepCount - 1)) / (m - 1));
//     map[pos] = tag;
//   });
//   return map;
// }
//
// function stepTimesMs(n: number, anchorMs: number): number[] {
//   if (n <= 0) return [];
//   if (n === 1) return [anchorMs];
//   const lead = Math.min(2000, anchorMs * 0.1);
//   return Array.from(
//     { length: n },
//     (_, i) => lead + ((anchorMs - lead) * i) / (n - 1),
//   );
// }
//
// function fmtTime(ms: number): string {
//   const total = Math.max(0, Math.round(ms / 1000));
//   const m = Math.floor(total / 60);
//   const sec = total % 60;
//   return `${m}:${String(sec).padStart(2, '0')}`;
// }
//
// const JourneyView = observer(({ card }: { card?: IssueSessionCard }) => {
//   const { player, store } = React.useContext(PlayerContext);
//   const state = store?.get?.() ?? {};
//   const nowMs: number = (state as any).time ?? 0;
//   const endMs: number = (state as any).endTime ?? 0;
//
//   const steps = toJourneySteps(card?.journey ?? '');
//   if (steps.length === 0) return null;
//   const stepTags = spreadTagsOverSteps(steps.length, card?.tags ?? []);
//
//   const issueMs = card?.issueTimestamp ?? 0;
//   const anchorMs =
//     issueMs && (!endMs || issueMs <= endMs)
//       ? issueMs
//       : endMs
//         ? endMs * 0.85
//         : 0;
//   const times = stepTimesMs(steps.length, anchorMs);
//
//   let current = 0;
//   times.forEach((t, i) => {
//     if (nowMs >= t - 500) current = i;
//   });
//
//   return (
//     <div className="flex flex-col">
//       {steps.map((s, i) => {
//         const last = i === steps.length - 1;
//         const tag = stepTags[i];
//         const active = i === current;
//         const dot = last ? 'var(--color-red)' : STEP_BLUE;
//         return (
//           <div
//             key={i}
//             role="button"
//             tabIndex={0}
//             title={`Jump to ${fmtTime(times[i])}`}
//             onClick={() => player?.jump(times[i])}
//             onKeyDown={(e) => {
//               if (e.key === 'Enter' || e.key === ' ') {
//                 e.preventDefault();
//                 player?.jump(times[i]);
//               }
//             }}
//             className={`group flex gap-2.5 -mx-2 px-2 rounded cursor-pointer transition-colors ${
//               last ? 'hover:bg-red-lightest' : 'hover:bg-active-blue'
//             }`}
//             style={{
//               background: active
//                 ? last
//                   ? 'var(--color-red-lightest)'
//                   : 'var(--color-active-blue)'
//                 : undefined,
//             }}
//           >
//             <div className="flex flex-col items-center shrink-0" style={{ width: 7 }}>
//               <span
//                 style={{ height: RAIL_LEAD, width: 1, background: i === 0 ? 'transparent' : RAIL }}
//               />
//               <span
//                 style={{
//                   width: active ? 8 : 6,
//                   height: active ? 8 : 6,
//                   borderRadius: 9999,
//                   background: dot,
//                   boxShadow: active
//                     ? `0 0 0 3px ${last ? 'var(--color-red-lightest)' : 'rgba(57,78,255,0.18)'}`
//                     : undefined,
//                 }}
//               />
//               {!last && (
//                 <span style={{ flex: 1, width: 1, minHeight: 8, background: RAIL }} />
//               )}
//             </div>
//             <div className="py-2 flex flex-col items-start gap-2 min-w-0 flex-1">
//               <div className="flex items-baseline justify-between gap-2 w-full">
//                 <span
//                   style={{
//                     fontSize: 13,
//                     lineHeight: 1.45,
//                     color: last ? 'var(--color-red)' : 'var(--color-gray-dark)',
//                     fontWeight: last || active ? 500 : 400,
//                   }}
//                 >
//                   {s}
//                 </span>
//                 <span
//                   className="shrink-0 flex items-center gap-1 tabular-nums"
//                   style={{ fontSize: 11, color: 'var(--color-gray-medium)' }}
//                 >
//                   <Play
//                     size={9}
//                     strokeWidth={0}
//                     className="opacity-0 transition-opacity group-hover:opacity-100"
//                     style={{ fill: last ? 'var(--color-red)' : STEP_BLUE }}
//                   />
//                   {fmtTime(times[i])}
//                 </span>
//               </div>
//               {tag && <TagChip label={tag} />}
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// });

import { Tooltip } from 'antd';
import React from 'react';

import { TagChip } from '../shared';

/* One-line tags row (Mehdi 07-28): wrapping tag rows made the session cards
   misalign, so tags never wrap — the row shows as many chips as fit and folds
   the rest behind a "+N" chip whose tooltip lists them. A hidden clone of the
   full row (chips + the +N probe) is measured, so the visible row never clips a
   chip mid-way. Re-measures on container resize. */

const GAP = 6; // = the row's gap-1.5

export default function TagsRow({ tags }: { tags: string[] }) {
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState(tags.length);

  React.useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return undefined;
    const compute = () => {
      const max = el.clientWidth;
      const kids = Array.from(el.children) as HTMLElement[];
      const probeW = kids[kids.length - 1]?.offsetWidth ?? 0;
      const widths = kids.slice(0, tags.length).map((k) => k.offsetWidth);
      const fits = (n: number) => {
        const chipsW =
          widths.slice(0, n).reduce((a, w) => a + w, 0) +
          Math.max(0, n - 1) * GAP;
        const overflowW = n < tags.length ? (n ? GAP : 0) + probeW : 0;
        return chipsW + overflowW <= max;
      };
      let n = tags.length;
      while (n > 0 && !fits(n)) n -= 1;
      setFit(n);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tags.join(' ')]);

  if (tags.length === 0) return null;
  const hidden = tags.slice(fit);

  return (
    <div className="relative w-full">
      {/* hidden measuring clone: every chip + the +N probe, natural widths */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute inset-x-0 top-0 flex items-center gap-1.5 invisible overflow-hidden"
      >
        {tags.map((t) => (
          <TagChip key={t} label={t} />
        ))}
        <TagChip label={`+${tags.length}`} />
      </div>
      <div className="flex items-center gap-1.5 overflow-hidden">
        {tags.slice(0, fit).map((t) => (
          <TagChip key={t} label={t} />
        ))}
        {hidden.length > 0 && (
          <Tooltip title={hidden.join(' · ')}>
            <span className="shrink-0 cursor-default">
              <TagChip label={`+${hidden.length}`} />
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

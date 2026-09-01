import { Tooltip } from 'antd';
import React from 'react';

import MetaItem from 'Shared/SessionItem/MetaItem';

import { TagChip } from '../shared';

/* One-line row: items never wrap — the row shows as many as fit and folds the
   rest behind a "+N". Two modes:
     • tags  — TagChip items, a chip-shaped "+N" (reads as one more tag)
     • pairs — MetaItem pills, a quiet gray "+N" (so it doesn't pose as a pair)
   A hidden clone of the full row (every item + the +N probe) is measured so the
   visible row never clips an item mid-way. Re-measures on container resize. */

const GAP = 6; // = the row's gap-1.5

type Pair = { label: string; value: string };

export default function TagsRow({
  tags,
  pairs,
}: {
  tags?: string[];
  pairs?: Pair[];
}) {
  const isPairs = pairs != null;
  const items: (string | Pair)[] = pairs ?? tags ?? [];
  const count = items.length;
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState(count);

  const sig = isPairs
    ? (pairs as Pair[]).map((p) => `${p.label}=${p.value}`).join('|')
    : (tags ?? []).join(' ');

  React.useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return undefined;
    const compute = () => {
      const max = el.clientWidth;
      const kids = Array.from(el.children) as HTMLElement[];
      const probeW = kids[kids.length - 1]?.offsetWidth ?? 0;
      const widths = kids.slice(0, count).map((k) => k.offsetWidth);
      const fits = (n: number) => {
        const itemsW =
          widths.slice(0, n).reduce((a, w) => a + w, 0) +
          Math.max(0, n - 1) * GAP;
        const overflowW = n < count ? (n ? GAP : 0) + probeW : 0;
        return itemsW + overflowW <= max;
      };
      let n = count;
      while (n > 0 && !fits(n)) n -= 1;
      setFit(n);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sig]);

  if (count === 0) return null;
  const hiddenCount = count - fit;

  const renderItem = (item: string | Pair, i: number) =>
    isPairs ? (
      <MetaItem
        key={`${(item as Pair).label}-${i}`}
        label={(item as Pair).label}
        value={(item as Pair).value}
      />
    ) : (
      <TagChip key={item as string} label={item as string} />
    );

  // the folded-count marker: a chip among tags, a quiet gray count among pairs
  const moreMarker = (n: number, titles: string[]) =>
    isPairs ? (
      <Tooltip title={titles.join(', ')} placement="top">
        <span
          className="text-xs shrink-0 cursor-default"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          +{n}
        </span>
      </Tooltip>
    ) : (
      <Tooltip title={titles.join(' · ')}>
        <span className="shrink-0 cursor-default">
          <TagChip label={`+${n}`} />
        </span>
      </Tooltip>
    );

  const titleOf = (item: string | Pair) =>
    isPairs
      ? `${(item as Pair).label}: ${(item as Pair).value}`
      : (item as string);

  return (
    <div className="relative w-full">
      {/* hidden measuring clone: every item + the +N probe, natural widths */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute inset-x-0 top-0 flex items-center gap-1.5 invisible overflow-hidden"
      >
        {items.map(renderItem)}
        {moreMarker(count, [])}
      </div>
      <div className="flex items-center gap-1.5 overflow-hidden">
        {items.slice(0, fit).map(renderItem)}
        {hiddenCount > 0 && moreMarker(hiddenCount, items.slice(fit).map(titleOf))}
      </div>
    </div>
  );
}

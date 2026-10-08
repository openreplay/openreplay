import { cn } from '@/lib/utils';
import { Button } from '@/ui/actions/button';
import { Input } from '@/ui/inputs/input';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const LONG_FROM = 8;

const JUMP = 5;

export const radiusFor = (last: number): 0 | 1 => (last >= 100 ? 0 : 1);

export function pages(
  current: number,
  last: number,
  radius: 0 | 1 = 1,
): (number | 'gap')[] {
  const span = 2 * radius + 5;
  if (last <= span) return Array.from({ length: last }, (_, i) => i + 1);
  const lo = Math.max(2, Math.min(current - radius, last - (2 * radius + 2)));
  const hi = Math.min(last - 1, Math.max(current + radius, 2 * radius + 3));
  const out: (number | 'gap')[] = [1];
  if (lo > 2) out.push('gap');
  for (let p = lo; p <= hi; p++) out.push(p);
  if (hi < last - 1) out.push('gap');
  out.push(last);
  return out;
}

export function Pagination({
  current,
  total,
  pageSize,
  onChange,
}: {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const last = Math.max(1, Math.ceil(total / pageSize));
  const long = last >= LONG_FROM;
  const radius = radiusFor(last);
  const [draft, setDraft] = useState('');

  useEffect(() => setDraft(''), [current]);
  const go = (n: number) => {
    const p = Math.min(last, Math.max(1, n));
    if (p !== current) onChange(p);
  };
  const commit = () => {
    const n = parseInt(draft, 10);
    if (!n) return;
    go(n);
    setDraft('');
  };

  const cell = (page: number) => (
    <Button
      key={page}
      variant={page === current ? 'secondary' : 'subtle'}
      size="icon"
      aria-current={page === current ? 'page' : undefined}
      aria-label={`Page ${page}`}
      className={cn(
        'w-auto min-w-control-sm px-2 text-xs tabular-nums',
        page === current &&
          'border-transparent bg-surface-active font-medium text-content-primary',
      )}
      onClick={() => onChange(page)}
    >
      {page}
    </Button>
  );

  const gap = (key: string, dir: -1 | 1) => (
    <Tooltip
      key={key}
      title={dir < 0 ? `Back ${JUMP} pages` : `Forward ${JUMP} pages`}
      delay={400}
    >
      <Button
        variant="subtle"
        size="icon"
        aria-label={dir < 0 ? `Back ${JUMP} pages` : `Forward ${JUMP} pages`}
        className="group text-xs text-content-placeholder"
        onClick={() => go(current + dir * JUMP)}
      >
        <span className="group-hover:hidden" aria-hidden="true">
          …
        </span>
        {dir < 0 ? (
          <ChevronsLeft
            size={14}
            strokeWidth={1.75}
            className="hidden group-hover:block"
            aria-hidden="true"
          />
        ) : (
          <ChevronsRight
            size={14}
            strokeWidth={1.75}
            className="hidden group-hover:block"
            aria-hidden="true"
          />
        )}
      </Button>
    </Tooltip>
  );

  return (
    <nav
      className="flex items-center gap-1"
      aria-label={t('Pagination')}
      data-long={long || undefined}
    >
      <Button
        variant="subtle"
        size="icon"
        disabled={current <= 1}
        aria-label={t('Previous page')}
        onClick={() => onChange(current - 1)}
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      {pages(current, last, radius).map((p, i) =>
        p === 'gap' ? gap(`gap${i}`, i === 1 ? -1 : 1) : cell(p),
      )}
      <Button
        variant="subtle"
        size="icon"
        disabled={current >= last}
        aria-label={t('Next page')}
        onClick={() => onChange(current + 1)}
      >
        <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
      </Button>

      {long && (
        <span className="ml-2 flex items-center border-l border-border-subtle pl-3">
          <Input
            value={draft}
            inputMode="numeric"
            placeholder={t('Go to')}
            title={`Type a page number between 1 and ${last} and press Enter`}
            aria-label={`Go to page, 1 to ${last}`}
            className="h-control-sm w-14 px-2 text-center text-xs tabular-nums"
            onChange={(e) =>
              setDraft(
                e.target.value
                  .replace(/[^0-9]/g, '')
                  .slice(0, String(last).length),
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
          />
        </span>
      )}
    </nav>
  );
}

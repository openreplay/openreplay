import { SimpleSelect } from '@/ui/inputs/select';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import './list-footer.css';
import { Pagination } from './pagination';
import {
  ROWS_OPTIONS,
  type RowsChoice,
  type RowsPerPage,
  useFitRows,
} from './rows-per-page';

export interface ListFooterProps {
  page: number;
  pageSize: number;
  total: number;

  /** The count phrase, so each language gets its plural form:
      `(count, n) => t('{{n}} sessions', { count, n })`. A [one, other] pair
      still works for callers outside this repo. */
  noun: ((count: number, n: string) => string) | [string, string];

  onPage?: (page: number) => void;

  detail?: string;
  /** offers 10 / 25 / 50 / 100 rows beside the pager, once the list is longer than 10 */
  onPageSize?: (size: RowsChoice) => void;
  /** Names a full-page list: Fit comes first in the rows choice, and under
      Fit a new count goes through `onPageSize('fit')` again. */
  fit?: string;
  /** page sizes of the host's own instead of the rows choices (cards, say),
      picked through `onSize` */
  sizes?: readonly number[];
  onSize?: (size: number) => void;
  sizeLabel?: string;
  /** a Fit the host measures itself: shown as chosen, `onFit` picks it */
  fitted?: boolean;
  onFit?: () => void;
  /** how far the pager can go when the list cannot reach its whole total */
  reachable?: number;
}

const choicesOf = (sizes: readonly number[]) =>
  sizes.map((n) => ({ value: String(n), label: String(n) }));

export function ListFooter({
  page,
  pageSize,
  total,
  noun,
  onPage,
  detail,
  onPageSize,
  fit,
  sizes,
  onSize,
  sizeLabel,
  fitted: fittedProp,
  onFit,
  reachable,
}: ListFooterProps) {
  const { t } = useTranslation();
  const foot = useRef<HTMLElement>(null);
  const listFitted = useFitRows(fit, foot, () => onPageSize?.('fit'));
  const fitted = fit != null ? listFitted : !!fittedProp;
  const offersFit = fit != null || onFit != null;
  const paginated = onPage != null && total > pageSize;
  const own = sizes != null && onSize != null;
  const offered = own ? sizes : ROWS_OPTIONS;
  const sizable =
    (own || onPageSize != null) && (offersFit || total > offered[0]);
  const choices = choicesOf(offered);
  const label = sizeLabel ?? t('Rows');

  const n = (x: number) => x.toLocaleString();
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const phrase =
    typeof noun === 'function'
      ? noun(total, n(total))
      : `${n(total)} ${total === 1 ? noun[0] : noun[1]}`;

  return (
    <footer className="m-listfoot" ref={foot}>
      <span className="m-listfoot__range">
        {paginated
          ? t('{{start}}–{{end}} of {{phrase}}', {
              start: n(start),
              end: n(end),
              phrase,
            })
          : `${phrase}${detail ? ` ${detail}` : ''}`}
      </span>
      {(paginated || sizable) && (
        <span className="m-listfoot__end">
          {sizable && (
            <label className="m-listfoot__rows">
              <span className="m-listfoot__rows-label">{label}</span>
              <SimpleSelect<string>
                variant="subtle"
                ariaLabel={
                  sizeLabel
                    ? t('{{label}} per page', { label: sizeLabel })
                    : t('Rows per page')
                }
                value={fitted ? 'fit' : String(pageSize)}
                onChange={(v) => {
                  if (!v) return;
                  if (v !== 'fit') {
                    if (own) onSize?.(Number(v));
                    else onPageSize?.(Number(v) as RowsPerPage);
                  } else if (fit != null) onPageSize?.('fit');
                  else onFit?.();
                }}
                options={
                  offersFit
                    ? [{ value: 'fit', label: t('Fit') }, ...choices]
                    : choices
                }
              />
            </label>
          )}
          {paginated && (
            <Pagination
              current={page}
              total={reachable != null ? Math.min(total, reachable) : total}
              pageSize={pageSize}
              onChange={onPage}
            />
          )}
        </span>
      )}
    </footer>
  );
}

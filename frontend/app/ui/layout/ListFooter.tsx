import { SimpleSelect } from '@/ui/inputs/select';
import { useTranslation } from 'react-i18next';

import './list-footer.css';
import { Pagination } from './pagination';
import { ROWS_OPTIONS, type RowsPerPage } from './rows-per-page';

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
  /** offers 10 / 50 / 100 rows beside the pager, once the list is longer than 10 */
  onPageSize?: (size: RowsPerPage) => void;
}

const ROWS = ROWS_OPTIONS.map((n) => ({
  value: String(n) as `${RowsPerPage}`,
  label: String(n),
}));

export function ListFooter({
  page,
  pageSize,
  total,
  noun,
  onPage,
  detail,
  onPageSize,
}: ListFooterProps) {
  const { t } = useTranslation();
  const paginated = onPage != null && total > pageSize;
  const sizable = onPageSize != null && total > ROWS_OPTIONS[0];

  const n = (x: number) => x.toLocaleString();
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const phrase =
    typeof noun === 'function'
      ? noun(total, n(total))
      : `${n(total)} ${total === 1 ? noun[0] : noun[1]}`;

  return (
    <footer className="m-listfoot">
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
              <span className="m-listfoot__rows-label">{t('Rows')}</span>
              <SimpleSelect<`${RowsPerPage}`>
                variant="subtle"
                ariaLabel={t('Rows per page')}
                value={String(pageSize) as `${RowsPerPage}`}
                onChange={(v) => v && onPageSize(Number(v) as RowsPerPage)}
                options={ROWS}
              />
            </label>
          )}
          {paginated && (
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={onPage}
            />
          )}
        </span>
      )}
    </footer>
  );
}

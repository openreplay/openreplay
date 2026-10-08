import { useTranslation } from 'react-i18next';

import './list-footer.css';
import { Pagination } from './pagination';

export interface ListFooterProps {
  page: number;
  pageSize: number;
  total: number;

  noun: [string, string];

  onPage?: (page: number) => void;

  detail?: string;
}

export function ListFooter({
  page,
  pageSize,
  total,
  noun,
  onPage,
  detail,
}: ListFooterProps) {
  const { t } = useTranslation();
  const paginated = onPage != null && total > pageSize;

  const n = (x: number) => x.toLocaleString();
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const word = total === 1 ? noun[0] : noun[1];

  return (
    <footer className="m-listfoot">
      <span className="m-listfoot__range">
        {paginated
          ? t('{{start}}–{{end}} of {{total}} {{noun}}', {
              start: n(start),
              end: n(end),
              total: n(total),
              noun: word,
            })
          : `${n(total)} ${word}${detail ? ` ${detail}` : ''}`}
      </span>
      {paginated && (
        <Pagination
          current={page}
          total={total}
          pageSize={pageSize}
          onChange={onPage}
        />
      )}
    </footer>
  );
}

import { useTranslation } from 'react-i18next';

import './skeleton-rows.css';

export interface SkeletonRowsProps {
  rows?: number;

  columns?: readonly number[];
}

export function SkeletonRows({
  rows = 6,
  columns = [10, 46, 20, 14, 6],
}: SkeletonRowsProps) {
  const { t } = useTranslation();
  return (
    <div className="m-skrows" role="status" aria-label={t('Loading')}>
      {Array.from({ length: rows }, (_, r) => (
        <div className="m-skrows__row" key={r}>
          {columns.map((w, c) => (
            <span
              key={c}
              className="m-skeleton m-skrows__cell"
              style={{
                flexBasis: `${w}%`,

                maxWidth: `${w - (c === 1 ? (r % 3) * 8 : 0)}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { Pagination } from 'UI';
import { numberWithCommas } from 'App/utils';

function FullPagination({
  page,
  limit,
  total,
  listLen,
  onPageChange,
  entity,
}: {
  page: number;
  limit: number;
  total: number;
  listLen: number;
  onPageChange: (page: number) => void;
  entity?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2">
      <div>
        {'Showing '}
        <span className="font-medium">{listLen === 0 ? 0 : (page - 1) * limit + 1}</span>
        {' to '}
        <span className="font-medium">{(page - 1) * limit + listLen}</span>
        {' of '}
        <span className="font-medium">{numberWithCommas(total)}</span>
        {entity ? ` ${entity}.` : '.'}
      </div>
      <Pagination
        page={page}
        total={total}
        onPageChange={onPageChange}
        limit={limit}
        debounceRequest={500}
      />
    </div>
  );
}

export default FullPagination;

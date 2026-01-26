import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from 'antd';
import { debounce } from 'App/utils';

// unchanged: props interface
type Props = {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  limit?: number;
  debounceRequest?: number;
};

export default function Pagination({
  page,
  total,
  onPageChange,
  limit = 5,
  debounceRequest = 0,
}: Props) {
  const [currentPage, setCurrentPage] = React.useState(page);
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const fmt = React.useMemo(() => new Intl.NumberFormat('en-US'), []);

  React.useEffect(() => {
    setInputValue(fmt.format(page));
  }, [page, fmt]);

  const debounceChange = React.useCallback(
    debounce(onPageChange, debounceRequest),
    [onPageChange, debounceRequest],
  );

  const changePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
    setInputValue(fmt.format(next));
    debounceChange(next);
  };

  const commitInput = React.useCallback(() => {
    const num = parseInt(inputValue.replace(/[^0-9]/g, ''), 10);
    if (!Number.isNaN(num)) {
      changePage(num);
    } else {
      setInputValue(fmt.format(currentPage));
    }
  }, [inputValue, changePage, currentPage, fmt]);

  return (
    <div className="flex items-center gap-2 select-none">
      <button
        aria-label="Previous page"
        disabled={currentPage === 1}
        onClick={() => changePage(currentPage - 1)}
        className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-gray-lightest disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={commitInput}
          onBlur={commitInput}
          className="w-14! text-center px-2 py-0 rounded-sm"
          size="small"
        />
        <span>/</span>
        <span className="min-w-[50px] text-center">
          {fmt.format(totalPages)}
        </span>
      </div>

      <button
        aria-label="Next page"
        disabled={currentPage === totalPages}
        onClick={() => changePage(currentPage + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-gray-lightest disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

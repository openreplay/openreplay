import React from 'react';
import { Pagination as AntPagination } from 'antd';
import { debounce } from 'App/utils';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit?: number;
  debounceRequest?: number;
}
export default function Pagination(props: Props) {
  const { page, totalPages, onPageChange, limit = 5, debounceRequest = 0 } = props;
  const [currentPage, setCurrentPage] = React.useState(page);
  React.useMemo(() => setCurrentPage(page), [page]);

  const debounceChange = React.useCallback(debounce(onPageChange, debounceRequest), []);

  const changePage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
      debounceChange(page);
    }
  };

  return (
    <>
      <AntPagination
        simple
        current={currentPage}
        total={totalPages}
        pageSize={limit}
        onChange={changePage}
        showSizeChanger={false}
      />
    </>
  )
}

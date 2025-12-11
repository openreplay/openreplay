import React from 'react';
import FilterEntriesModal from '../FilterEntriesModal';

function ColumnsModal({
  columns,
  onSelect,
  hiddenCols,
  topOffset = 'top-28',
  onClose,
}: {
  columns: { title: string; key: string }[];
  onSelect: (col: string[]) => void;
  hiddenCols: string[];
  topOffset?: string;
  onClose?: () => void;
}) {
  return (
    <FilterEntriesModal
      columns={columns}
      topOffset={topOffset}
      onSelect={onSelect}
      hiddenCols={hiddenCols}
      header={'Show/Hide Columns'}
      subheader={'Select columns to display. Rearrange them in the table view.'}
      searchText={'Search columns'}
      confirmText={'Show Selected'}
      onClose={onClose}
    />
  );
}

export default ColumnsModal;

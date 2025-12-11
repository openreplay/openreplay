import React from 'react';
import { Input, Checkbox, Button } from 'antd';
import cn from 'classnames';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

function FilterEntriesModal({
  columns,
  onSelect,
  hiddenCols,
  topOffset = 'top-28',
  header,
  subheader,
  searchText,
  confirmText,
  onClose,
  left,
}: {
  columns: { title: string; key: string }[];
  onSelect: (col: string[]) => void;
  hiddenCols: string[];
  topOffset?: string;
  header?: string;
  subheader?: string;
  searchText?: string;
  confirmText?: string;
  onClose?: () => void;
  left?: boolean;
}) {
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(
    columns.map((col) => col.key).filter((col) => !hiddenCols.includes(col)),
  );

  const onConfirm = () => {
    onSelect(selected);
  };
  const onToggle = (col: string, isSelected: boolean) => {
    const newList = isSelected
      ? [...selected, col]
      : selected.filter((c) => c !== col);
    setSelected(newList);
  };

  const searchRe = new RegExp(query, 'ig');
  const filteredList = columns.filter((col) => searchRe.test(col.title));
  return (
    <OutsideClickDetectingDiv onClickOutside={onClose}>
      <div
        className={cn(
          'flex flex-col gap-2 shadow border rounded-lg p-4 absolute z-50 bg-white min-w-[300px]',
          left ? 'left-0' : 'right-0',
          topOffset,
        )}
      >
        <div className="font-semibold text-lg">{header}</div>
        <div className="text-sm">{subheader}</div>
        <Input.Search
          placeholder={searchText || 'Search entries'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filteredList.map((col) => (
          <Checkbox
            onChange={(e) => onToggle(col.key, e.target.checked)}
            checked={selected.includes(col.key)}
          >
            {col.title}
          </Checkbox>
        ))}
        <Button onClick={onConfirm} type={'primary'}>
          {confirmText || 'Show Selected'}
        </Button>
      </div>
    </OutsideClickDetectingDiv>
  );
}

export default FilterEntriesModal;

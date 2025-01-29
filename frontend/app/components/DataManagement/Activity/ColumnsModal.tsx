import React from 'react';
import { Input, Checkbox, Button } from 'antd';

function ColumnsModal({
  columns,
  onSelect,
  hiddenCols,
}: {
  columns: { title: string; key: string }[];
  onSelect: (col: string[]) => void;
  hiddenCols: string[];
}) {
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(
    columns.map((col) => col.key).filter((col) => !hiddenCols.includes(col))
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
    <div className="flex flex-col gap-2 shadow border rounded-lg p-4 absolute top-28 right-0 z-50 bg-white">
      <div className="font-semibold text-lg">Show/Hide Columns</div>
      <div className="text-sm">
        Select columns to display. Rearrange them in the table view.
      </div>
      <Input.Search
        placeholder={'Search columns'}
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
        Show Selected
      </Button>
    </div>
  );
}

export default ColumnsModal;

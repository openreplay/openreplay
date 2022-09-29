import React from 'react';

interface Props {
  shades: Record<string, string>;
  pathRoot: string;
  path: string;
  diff: Record<string, any>;
}

function DiffRow({ diff, path, pathRoot, shades }: Props) {
  const [shorten, setShorten] = React.useState(true);
  const oldValue = diff.item ? JSON.stringify(diff.item.lhs) : JSON.stringify(diff.lhs);
  const newValue = diff.item ? JSON.stringify(diff.item.rhs) : JSON.stringify(diff.rhs);

  const pathStr = path.length > 15 && shorten ? path.slice(0, 5) + '...' + path.slice(10) : path;
  return (
    <div className="p-1 rounded" style={{ background: shades[pathRoot] }}>
      <span className={path.length > 15 ? 'cursor-pointer' : ''} onClick={() => setShorten(false)}>
        {pathStr}
        {': '}
      </span>
      <span className="line-through text-disabled-text">{oldValue || 'undefined'}</span>
      {' -> '}
      <span className={`${!newValue ? 'text-red' : 'text-green'}`}>{newValue || 'undefined'}</span>
    </div>
  );
}

export default DiffRow;

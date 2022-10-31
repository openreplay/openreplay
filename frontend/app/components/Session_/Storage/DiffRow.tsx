import React from 'react';

interface Props {
  shades: Record<string, string>;
  pathRoot: string;
  path: string;
  diff: Record<string, any>;
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  // @ts-ignore
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

function DiffRow({ diff, path }: Props) {
  const [shorten, setShorten] = React.useState(true);

  const oldValue = diff.item ? JSON.stringify(diff.item.lhs, getCircularReplacer()) : JSON.stringify(diff.lhs, getCircularReplacer());
  const newValue = diff.item ? JSON.stringify(diff.item.rhs, getCircularReplacer()) : JSON.stringify(diff.rhs, getCircularReplacer());

  const pathStr = path.length > 15 && shorten ? path.slice(0, 5) + '...' + path.slice(10) : path;
  return (
    <div className="p-1 rounded">
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

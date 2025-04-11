import React from 'react';
import cn from 'classnames';

interface Props {
  shades?: Record<string, string>;
  pathRoot?: string;
  path: string;
  diff: Record<string, any>;
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  // @ts-ignore
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
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
  const [shortenOldVal, setShortenOldVal] = React.useState(true);
  const [shortenNewVal, setShortenNewVal] = React.useState(true);

  // Adjust to handle the difference based on its type
  let oldValue;
  let newValue;

  switch (diff.type) {
    case 'CHANGE':
      oldValue = JSON.stringify(diff.oldValue, null, 2);
      newValue = JSON.stringify(diff.value, null, 2);
      break;
    case 'CREATE':
      oldValue = 'undefined'; // No oldValue in CREATE type
      newValue = JSON.stringify(diff.value, null, 2);
      break;
    case 'REMOVE':
      oldValue = JSON.stringify(diff.oldValue, null, 2);
      newValue = 'undefined'; // No newValue in REMOVE type
      break;
    default:
      // Handle unexpected types, though not expected in current microdiff version
      console.error('Unexpected diff type:', diff.type);
      oldValue = 'error';
      newValue = 'error';
  }

  const { length } = path;
  const diffLengths = [oldValue?.length || 0, newValue?.length || 0];

  const pathStr =
    length > 20 && shorten
      ? `${path.slice(0, 5)}...${path.slice(length - 10, length)}`
      : path;

  const oldValueSafe =
    diffLengths[0] > 50 && shortenOldVal
      ? `${oldValue.slice(0, 10)} ... ${oldValue.slice(diffLengths[0] - 25, diffLengths[0])}`
      : oldValue;
  const newValueSafe =
    diffLengths[1] > 50 && shortenNewVal
      ? `${newValue.slice(0, 10)} ... ${newValue.slice(diffLengths[1] - 25, diffLengths[1])}`
      : newValue;

  return (
    <div className="p-1 rounded flex flex-wrap gap-2">
      <span
        className={length > 20 ? 'cursor-pointer' : ''}
        onClick={() => setShorten(!shorten)}
      >
        {pathStr}
        {': '}
      </span>
      <div
        onClick={() => setShortenOldVal(!shortenOldVal)}
        className={cn(
          'text-disabled-text',
          diffLengths[0] > 50 ? 'cursor-pointer' : '',
        )}
      >
        <span className="line-through">{oldValueSafe || 'undefined'}</span>
        {diffLengths[0] > 50 ? (
          <div
            onClick={() => setShortenOldVal(!shortenOldVal)}
            className="cursor-pointer px-1 text-white bg-gray-light rounded text-sm w-fit"
          >
            {!shortenOldVal ? 'collapse' : 'expand'}
          </div>
        ) : null}
      </div>
      {' -> '}
      <div
        className={cn('whitespace-pre', newValue ? 'text-red' : 'text-green')}
      >
        {newValueSafe || 'undefined'}
        {diffLengths[1] > 50 ? (
          <div
            onClick={() => setShortenNewVal(!shortenNewVal)}
            className="cursor-pointer px-1 text-white bg-gray-light rounded text-sm w-fit"
          >
            {!shortenNewVal ? 'collapse' : 'expand'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DiffRow;

import React from 'react';

import '../charts.css';

interface ListItem {
  icon?: any;
  name?: string;
  title?: string;
  progress: number;
  value?: number;
  domain?: string;
}

interface Props {
  list: ListItem[];
}

/** A predefined widget's ranked list: icon, label, count, share bar. */
function ListWithIcons({ list = [] }: Props) {
  return (
    <div className="m-vlist">
      {list.map((row, i) => (
        <div key={row.domain ?? row.name ?? i} className="m-vlist__row">
          {row.icon ?? null}
          <div className="m-vlist__body">
            <div className="m-vlist__line">
              <span>{row.name ?? row.title}</span>
              <span className="m-vlist__n">{row.value}</span>
            </div>
            <span className="m-vlist__bar">
              <i style={{ width: `${row.progress}%` }} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ListWithIcons;

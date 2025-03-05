import React from 'react';
import CardSessionsByList from 'Components/Dashboard/Widgets/CardSessionsByList';
import ExCard from '../ExCard';

function ByComponent({
  title,
  rows,
  lineWidth,
  onCard,
  type,
}: {
  title: string;
  rows: {
    label: string;
    progress: number;
    value: string;
    icon: React.ReactNode;
  }[];
  onCard: (card: string) => void;
  type: string;
  lineWidth: number;
}) {
  const _rows = rows
    .map((r) => ({
      ...r,
      name: r.label,
      displayName: r.label,
      sessionCount: r.value,
    }))
    .slice(0, 4);

  return (
    <ExCard title={title} onCard={onCard} type={type}>
      <div className="flex gap-1 flex-col">
        <CardSessionsByList
          list={_rows}
          selected=""
          onClickHandler={() => null}
        />
      </div>
    </ExCard>
  );
}

export default ByComponent;

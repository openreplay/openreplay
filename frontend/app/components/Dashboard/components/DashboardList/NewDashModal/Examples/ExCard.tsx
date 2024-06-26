import React from 'react'

function ExCard({
  title,
  children,
  type,
  onCard,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  type: string;
  onCard: (card: string) => void;
}) {
  return (
    <div
      className={'rounded-lg overflow-hidden border border-transparent p-4 bg-white hover:border-blue hover:shadow-sm'}
      style={{ width: '100%', height: 286 }}
    >
      <div className={'font-medium text-lg'}>{title}</div>
      <div className={'flex flex-col gap-2 mt-2 cursor-pointer'} onClick={() => onCard(type)}>{children}</div>
    </div>
  );
}

export default ExCard

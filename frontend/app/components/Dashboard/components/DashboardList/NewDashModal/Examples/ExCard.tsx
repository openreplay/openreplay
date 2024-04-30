import React from 'react'

function ExCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={'rounded overflow-hidden border p-4 bg-white'}
      style={{ width: 400, height: 286 }}
    >
      <div className={'font-semibold text-lg'}>{title}</div>
      <div className={'flex flex-col gap-2 mt-2'}>{children}</div>
    </div>
  );
}

export default ExCard
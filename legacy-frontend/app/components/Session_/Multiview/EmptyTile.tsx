import React from 'react'
import { InactiveTab } from 'App/components/Session_/Player/Controls/AssistSessionsTabs';

function EmptyTile({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="border hover:bg-active-blue hover:border-borderColor-primary flex flex-col gap-2 items-center justify-center cursor-pointer"
      onClick={onClick}
    >
      <InactiveTab classNames="!bg-gray-bg w-12" />
      Add Session
    </div>
  );
}

export default EmptyTile;

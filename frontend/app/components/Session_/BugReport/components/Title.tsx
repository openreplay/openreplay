import React from 'react'
import ReportTitle from './ReportTitle';

export default function Title({ userName }: { userName: string }) {
  return (
    <div className="flex items-center py-2 px-3 justify-between bg-gray-lightest rounded">
      <div className="flex flex-col gap-2">
        <ReportTitle />
        <div className="text-gray-medium">By {userName}</div>
      </div>
      <div>
        <div>Severity</div>
        <div>select here</div>
      </div>
    </div>
  );
}

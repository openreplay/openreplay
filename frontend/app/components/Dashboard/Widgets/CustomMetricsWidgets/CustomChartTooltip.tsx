import React from "react";
import { formatTimeOrDate } from "App/date";

function CustomTooltip({ active, payload, label }) {
  if (!active) return;

  const shownPayloads = payload.filter((p) => !p.hide);
  return (
    <div className={'flex flex-col gap-1 bg-white shadow border rounded p-2'}>
      {shownPayloads.map((p, index) => (
        <>
          <div className={'flex gap-2 items-center'}>
            <div
              style={{ borderRadius: 99, background: p.color }}
              className={'h-5 w-5 flex items-center justify-center'}
            >
              <div className={'invert text-sm'}>{index + 1}</div>
            </div>
            <div className={'font-semibold'}>{p.name}</div>
          </div>
          <div
            style={{ borderLeft: `2px solid ${p.color}` }}
            className={'flex flex-col py-2 px-2 ml-2'}
          >
            <div className={'text-disabled-text text-sm'}>
              {label}, {formatTimeOrDate(p.payload.timestamp)}
            </div>
            <div className={'font-semibold'}>{p.value}</div>
          </div>
        </>
      ))}
    </div>
  );
}

export default CustomTooltip;
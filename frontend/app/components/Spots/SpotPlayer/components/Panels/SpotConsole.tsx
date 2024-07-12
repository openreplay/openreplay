import React from 'react'
import { X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import spotPlayerStore from "../../spotPlayerStore";

function SpotConsole() {
  const logs = spotPlayerStore.logs;
  return (
    <div className={'w-full'} style={{ height: 200 }}>
      <div className={'px-4 py-2 border-t border-b border-gray-light'}>
        <div>Console</div>
        <div>
          <X size={16} />
        </div>
      </div>

      <div>
        {logs.map((log) => (
          <div key={log.time} className={'flex flex-col gap-2'}>
            <div className={'flex items-center gap-2'}>
              <div className={'w-8 h-8 bg-tealx rounded-full flex items-center justify-center color-white uppercase'}>
                {log.type[0]}
              </div>
              <div className={'font-semibold'}>{log.type}</div>
            </div>
            <div>{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default observer(SpotConsole);
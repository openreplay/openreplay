import { durationFromMs } from 'App/date';
import { Timed } from "Player";
import React from 'react';
import { Icon } from 'UI';

type SocketMsg = Timed & {
  channelName: string;
  data: string;
  timestamp: number;
  dir: 'up' | 'down';
  messageType: string;
}

interface Props {
  setOpenSocket: (val: any) => void;
  panelHeight: number;
  socketMsgList: Array<SocketMsg>;
}

function WSModal({ setOpenSocket, panelHeight, socketMsgList, }: Props) {
  const [selectedItem, setSelectedItem] = React.useState<SocketMsg | null>(null);
  return (
    <div className={'absolute right-0 top-0 h-full w-3/4 bg-white z-10 border shadow'}>
      <div className={'grid grid-cols-10 bg-gray-lightest uppercase text-sm'}>
        <div className={'border border-gray-light col-span-8 flex items-center gap-2 p-2'}>
          <div className={'cursor-pointer h-fit w-fit'} onClick={() => setOpenSocket(null)}>
            <Icon name={'cross'} size={16} color={'black'} />
          </div>
          <div>Data</div>
        </div>
        <div className={'border-t border-b  border-gray-light col-span-1 p-2'}>Length</div>
        <div className={'border  border-gray-light col-span-1 p-2'}>Time</div>
      </div>
      <div style={{ height: '100%', maxHeight: panelHeight - 37, overflow: 'auto' }}>
        {socketMsgList.map((msg) => (
          <div
            className={`grid grid-cols-10 ${msg.data.length > 100 ? 'hover:bg-active-blue cursor-pointer' : ''}`}
            onClick={() => msg.data.length > 100 ? setSelectedItem(msg) : null}
            style={{ height: 44 }}
          >
            <div className={'border-gray-light border col-span-8 flex items-center gap-2 p-2'}>
              <MsgDirection dir={msg.dir} />
              <span className={'bg-active-blue px-2 py-1'}>{msg.messageType}</span>
              <span className={'overflow-hidden text-ellipsis whitespace-nowrap'} style={{ maxHeight: 44 }}>{msg.data}</span>
            </div>
            <div className={'border-gray-light border-t border-b col-span-1 p-2'}>
              {msg.data.length}
            </div>
            <div className={'border-gray-light border col-span-1 p-2'}>
              {durationFromMs(msg.time, true)}
            </div>
          </div>
        ))}
      </div>
      {selectedItem ? (
        <div className={'border absolute shadow bottom-0 left-0 w-full h-1/2 bg-gray-lightest flex flex-col'}>
          <div className={'flex items-center gap-2 p-2 border-b-gray-light border'}>
            <div className={'link w-fit'} onClick={() => setSelectedItem(null)}>Close</div>
            <div>|</div>
            <div>{selectedItem.messageType}</div>
            <div>|</div>
            <div>{durationFromMs(selectedItem.time, true)}</div>
          </div>
          <div style={{ maxHeight: (panelHeight - 37)/2, overflow: 'auto' }} className={'whitespace-pre-wrap p-2 pt-0'}>
            {selectedItem.data}
          </div>
        </div>
      ) : null}
    </div>
  );
}


function MsgDirection({ dir }: { dir: 'up' | 'down' }) {
  return (
    <Icon
      name={dir === 'up' ? 'arrow-up' : 'arrow-down'}
      size="12"
      color={dir === 'up' ? 'red' : 'main'}
    />
  );
}

export default WSModal;
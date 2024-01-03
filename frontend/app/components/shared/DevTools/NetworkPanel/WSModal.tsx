import { durationFromMs } from 'App/date';
import { Timed } from 'Player';
import React from 'react';
import { Icon } from 'UI';

type SocketMsg = Timed & {
  channelName: string;
  data: string;
  timestamp: number;
  dir: 'up' | 'down';
  messageType: string;
};

interface Props {
  socketMsgList: Array<SocketMsg>;
}

function WSModal({ socketMsgList }: Props) {
  return (
    <div className={'h-screen w-full bg-white shadow'}>
      <div className={'grid grid-cols-12 font-semibold border-b px-4 py-2'}>
        <div className={'col-span-9 flex items-center gap-2'}>Data</div>
        <div className={'col-span-1'}>Length</div>
        <div className={'col-span-2 text-right'}>Time</div>
      </div>
      <div style={{ height: '100%', maxWidth: 700, overflowY: 'auto' }}>
        {socketMsgList.map((msg) => (
          <Row msg={msg} key={msg.timestamp} />
        ))}
      </div>
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

function Row({ msg }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <div
        className={`border-b grid grid-cols-12 ${
          msg.data.length > 100 ? 'hover:bg-active-blue cursor-pointer' : ''
        }`}
        onClick={() => (msg.data.length > 100 ? setIsOpen(!isOpen) : null)}
        style={{ width: 700 }}
      >
        <div className={'col-span-9 flex items-center gap-2 p-2'}>
          <MsgDirection dir={msg.dir} />
          <span className={'bg-active-blue px-2 py-1'}>{msg.messageType}</span>
          <span
            className={'overflow-hidden text-ellipsis whitespace-nowrap'}
            style={{ maxHeight: 44 }}
          >
            {msg.data}
          </span>
          {msg.data.length > 100 ? (
            <div
              className={
                'rounded-full font-bold text-xl p-2 bg-white w-6 h-6 flex items-center justify-center'
              }
            >
              <span>{isOpen ? '-' : '+'}</span>
            </div>
          ) : null}
        </div>
        <div className={'col-span-1 p-2'}>{msg.data.length}</div>
        <div className={'col-span-2 p-2 text-right'}>{durationFromMs(msg.time, true)}</div>
      </div>
      {isOpen ? (
        <div className={'w-full h-fit bg-active-blue pl-6 pb-4 pr-2'}>
          <div
            style={{ maxHeight: "100%", overflow: "auto" }}
            className={'whitespace-pre-wrap'}
          >
            {msg.data}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default WSModal;

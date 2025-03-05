import { Timed } from 'Player';
import React from 'react';

import { durationFromMs } from 'App/date';
import { filterList } from 'App/utils';
import { CopyButton, Icon, Input } from 'UI';
import { useTranslation } from 'react-i18next';

type SocketMsg = Timed & {
  channelName: string;
  data: string;
  timestamp: number;
  dir: 'up' | 'down';
  messageType: string;
};

interface Props {
  socketMsgList: Array<SocketMsg>;
  onClose: () => void;
}

const lineLength = 40;

function WSPanel({ socketMsgList, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const [list, setList] = React.useState(socketMsgList);
  const [selectedRow, setSelectedRow] = React.useState<{
    msg: SocketMsg;
    id: number;
  } | null>(null);

  const onQueryChange = (e: any) => {
    setQuery(e.target.value);
    const newList = filterList(socketMsgList, e.target.value, [
      'data',
      'messageType',
    ]);
    setList(newList);
  };
  return (
    <div className="h-full w-3/4 absolute top-0 right-0 bg-white border z-10">
      <div className="flex items-center p-2 w-full gap-2">
        <Icon
          name="close"
          size={16}
          onClick={onClose}
          className="cursor-pointer"
        />
        <div>{socketMsgList[0].channelName}</div>
        <div className="ml-auto">
          <Input
            className="input-small"
            placeholder={t('Filter by name, type, method or value')}
            icon="search"
            name="filter"
            onChange={onQueryChange}
            height={28}
            width={280}
            value={query}
          />
        </div>
      </div>
      <div className="grid grid-cols-12 font-semibold border-b px-4 py-2">
        <div className="col-span-9 flex items-center gap-2">{t('Data')}</div>
        <div className="col-span-1">{t('Length')}</div>
        <div className="col-span-2 text-right">{t('Time')}</div>
      </div>
      <div
        style={{
          height: 'calc(100% - 78px)',
          width: '100%',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {list.map((msg, i) => (
          <Row
            msg={msg}
            key={msg.timestamp}
            onSelect={() => setSelectedRow({ msg, id: i })}
            isSelected={selectedRow ? selectedRow.id === i : false}
          />
        ))}
        {selectedRow ? (
          <SelectedRow
            msg={selectedRow.msg}
            onClose={() => setSelectedRow(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function SelectedRow({
  msg,
  onClose,
}: {
  msg: SocketMsg;
  onClose: () => void;
}) {
  const content = React.useMemo(() => JSON.stringify(msg, null, 2), []);
  return (
    <div className="absolute bottom-0 left-0 h-3/4 w-full flex flex-col bg-white border-t border-gray-lighter">
      <div className="flex gap-2 items-center p-2">
        <Icon
          name="close"
          size={16}
          onClick={onClose}
          className="cursor-pointer"
        />
        <span>{msg.messageType}</span>
        <div className="ml-auto">
          <CopyButton content={content} />
        </div>
      </div>
      <div className="border-t border-gray-lighter bg-gray-lightest p-4">
        {msg.data}
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

function Row({
  msg,
  onSelect,
  isSelected,
}: {
  msg: SocketMsg;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className="border-b grid grid-cols-12 hover:bg-active-blue cursor-pointer"
      onClick={onSelect}
    >
      <div className="col-span-9 flex items-center gap-2 p-2">
        <MsgDirection dir={msg.dir} />
        <span className="bg-active-blue px-2 py-1">{msg.messageType}</span>
        <span
          className="overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ maxHeight: 44 }}
        >
          {msg.data}
        </span>
        {msg.data.length > lineLength ? (
          <div className="rounded-full font-bold text-xl p-2 bg-white w-6 h-6 flex items-center justify-center">
            <span>{isSelected ? '-' : '+'}</span>
          </div>
        ) : null}
      </div>
      <div className="col-span-1 p-2">{msg.data.length}</div>
      <div className="col-span-2 p-2 text-right">
        {durationFromMs(msg.time, true)}
      </div>
    </div>
  );
}

export default WSPanel;

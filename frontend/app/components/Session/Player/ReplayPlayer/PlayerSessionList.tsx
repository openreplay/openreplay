import React from 'react';
import { observer } from 'mobx-react-lite';
import { X } from 'lucide-react';

import { useStore } from 'App/mstore';
import SessionItem from 'Components/shared/SessionItem/SessionItem';
import { Pagination } from 'UI';

const PAGE_SIZE = 10;

interface Props {
  onClose: () => void;
}

function PlayerSessionList({ onClose }: Props) {
  const { sessionStore } = useStore();
  const [page, setPage] = React.useState(1);
  const { list, lastPlayedSessionId } = sessionStore;
  const total = list.length;

  const paginatedList = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div
      className="flex flex-col h-full border-r bg-white shrink-0"
      style={{ width: '300px' }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="font-semibold text-sm">Sessions ({total})</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-lightest"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {paginatedList.map((session) => (
          <div key={session.sessionId} className="border-b">
            <SessionItem
              session={session}
              compact
              vertical
              slim
              noWrap
              lastPlayedSessionId={lastPlayedSessionId}
            />
          </div>
        ))}
      </div>
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center p-2 border-t">
          <Pagination
            page={page}
            total={total}
            onPageChange={setPage}
            limit={PAGE_SIZE}
          />
        </div>
      )}
    </div>
  );
}

export default observer(PlayerSessionList);

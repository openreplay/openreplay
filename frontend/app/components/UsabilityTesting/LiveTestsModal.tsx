import React from 'react';
import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Input } from 'antd';
import ReloadButton from "Shared/ReloadButton";
import SessionItem from 'Shared/SessionItem';
import { Pagination } from 'UI';
import { observer } from 'mobx-react-lite';

function LiveTestsModal({ testId, closeModal }: { testId: string, closeModal: () => void }) {
  const [page, setPage] = React.useState(1);
  const [userId, setUserId] = React.useState('');
  const { uxtestingStore } = useStore();

  React.useEffect(() => {
    uxtestingStore.getAssistSessions(testId, page, undefined);
  }, []);

  const refreshData = (page: number) => {
    setPage(page);
    uxtestingStore.getAssistSessions(testId, page, userId);
  };

  return (
    <div className={'h-screen p-4 bg-white'}>
      <div className={'border-b flex items-center justify-between mb-4 py-2'}>
        <ReloadButton onClick={() => refreshData(page)} />
        <div className={'w-3/4 font-semibold text-xl'}>Live Participants</div>
        <Input.Search
          allowClear
          placeholder="Search by participant ID or name"
          onChange={(e) => setUserId(e.target.value)}
          onSearch={() => refreshData(page)}
        />
      </div>
      {uxtestingStore.testAssistSessions.list.map((s: any) => (
        <SessionItem onClick={closeModal} key={s.sessionId} session={s} live />
      ))}
      <div className={'flex items-center justify-between'}>
        <div>
          Showing{' '}
          <span className="font-medium">{(uxtestingStore.testSessions.page - 1) * 10 + 1}</span> to{' '}
          <span className="font-medium">
            {(uxtestingStore.page - 1) * 10 + uxtestingStore.testSessions.list.length}
          </span>{' '}
          of{' '}
          <span className="font-medium">{numberWithCommas(uxtestingStore.testSessions.total)}</span>{' '}
          ongoing tests.
        </div>
        <Pagination
          page={uxtestingStore.testAssistSessions.page}
          totalPages={Math.ceil(uxtestingStore.testAssistSessions.total / 10)}
          onPageChange={refreshData}
          limit={10}
          debounceRequest={200}
        />
      </div>
    </div>
  );
}

export default observer(LiveTestsModal);

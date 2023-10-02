import { DownOutlined } from '@ant-design/icons';
import { AssistStatsSession, SessionsResponse } from 'App/services/AssistStatsService';
import { numberWithCommas } from 'App/utils';
import React from 'react';
import { Button, Dropdown, Space, Typography } from 'antd';
import { CloudDownloadOutlined, TableOutlined } from '@ant-design/icons';
import { Loader, Pagination } from 'UI';
import PlayLink from 'Shared/SessionItem/PlayLink';
import { recordingsService } from 'App/services';
import { checkForRecent, getDateFromMill } from 'App/date'

interface Props {
  onSort: (v: string) => void;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  sessions: SessionsResponse;
  exportCSV: () => void;
}

const PER_PAGE = 10;
const sortItems = [
  {
    key: '1',
    label: 'Newest First',
  },
  {
    key: '2',
    label: 'Live Duration',
  },
  {
    key: '3',
    label: 'Call Duration',
  },
  {
    key: '4',
    label: 'Remote Duration',
  },
  {
    key: '5',
    label: 'Team Member',
  },
];

const total = 100;

function StatsTable({ onSort, isLoading, onPageChange, page, sessions, exportCSV }: Props) {
  const [sortValue, setSort] = React.useState(sortItems[0].label);
  const updateRange = ({ key }: { key: string }) => {
    const item = sortItems.find((item) => item.key === key);
    setSort(item?.label || sortItems[0].label);
    item?.key && onSort(item.key);
  };

  return (
    <div className={'rounded bg-white border'}>
      <div className={'flex items-center p-4 gap-2'}>
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          Assisted Sessions
        </Typography.Title>
        <div className={'ml-auto'} />
        <Dropdown menu={{ items: sortItems, onClick: updateRange }}>
          <Button size={'small'}>
            <Space>
              <Typography.Text>{sortValue}</Typography.Text>
              <DownOutlined rev={undefined} />
            </Space>
          </Button>
        </Dropdown>
        <Button size={'small'} icon={<TableOutlined rev={undefined} />} onClick={exportCSV}>
          Export CSV
        </Button>
      </div>
      <div className={'bg-gray-lightest grid grid-cols-8 items-center font-semibold p-4'}>
        <div className="col-span-1">Date</div>
        <div className="col-span-2">Team Members</div>
        <div className="col-span-1">Live Duration</div>
        <div className="col-span-1">Call Duration</div>
        <div className="col-span-1">Remote Duration</div>
        <div className="col-span-1" />
        <div className="col-span-1">{/*  BUTTONS */}</div>
      </div>
      <div className={'bg-white'}>
        <Loader loading={isLoading} style={{ height: 300 }}>
          {sessions.list.map((session) => (
            <Row session={session} />
          ))}
        </Loader>
      </div>
      <div className={'flex items-center justify-between p-4'}>
        {isLoading || !sessions?.list?.length ? null : (
          <>
            <div>
              Showing <span className="font-medium">{(page - 1) * PER_PAGE + 1}</span> to{' '}
              <span className="font-medium">{(page - 1) * PER_PAGE + sessions.list.length}</span> of{' '}
              <span className="font-medium">{numberWithCommas(sessions.total)}</span> sessions.
            </div>
            <Pagination
              page={page}
              totalPages={Math.ceil(100 / 10)}
              onPageChange={onPageChange}
              limit={10}
              debounceRequest={200}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Row({ session }: { session: AssistStatsSession }) {

  return (
    <div className={'grid grid-cols-8 p-4 border-b hover:bg-active-blue'}>
      <Cell size={1}>{checkForRecent(getDateFromMill(session.timestamp)!, 'LLL dd, yyyy, hh:mm a')}</Cell>
      <Cell size={2}>
        <div className={'flex gap-2'}>
          {session.teamMembers.map((member) => (
            <div className={'p-1 rounded border bg-gray-lightest w-fit'}>{member.name}</div>
          ))}
        </div>
      </Cell>
      <Cell size={1}>{session.liveDuration}</Cell>
      <Cell size={1}>{session.callDuration}</Cell>
      <Cell size={1}>{session.remoteDuration}</Cell>
      <Cell size={1} />
      <Cell size={1}>
        <div className={'w-full flex justify-end gap-4'}>
          {session.recordings.length > 0 ? (
            session.recordings.length > 1 ? (
              <Dropdown
                menu={{
                  items: session.recordings.map((recording) => ({
                    key: recording.recordId,
                    label: recording.name.slice(0, 20),
                  })),
                  onClick: (item) => recordingsService.fetchRecording(item.key),
                }}
              >
                <CloudDownloadOutlined rev={undefined} style={{ fontSize: 22, color: '#8C8C8C' }} />
              </Dropdown>
            ) : (
              <div
                className={'cursor-pointer'}
                onClick={() => recordingsService.fetchRecording(session.recordings[0].recordId)}
              >
                <CloudDownloadOutlined rev={undefined} style={{ fontSize: 22, color: '#8C8C8C' }} />
              </div>
            )
          ) : null}
          <PlayLink isAssist={false} viewed={false} sessionId={session.sessionId} />
        </div>
      </Cell>
    </div>
  );
}

function Cell({ size, children }: { size: number; children?: React.ReactNode }) {
  return <div className={`col-span-${size}`}>{children}</div>;
}

export default StatsTable;

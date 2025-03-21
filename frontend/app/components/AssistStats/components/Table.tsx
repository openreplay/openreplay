import {
  DownOutlined,
  CloudDownloadOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  AssistStatsSession,
  SessionsResponse,
} from 'App/services/AssistStatsService';
import { numberWithCommas } from 'App/utils';
import React from 'react';
import { Button, Dropdown, Space, Typography, Tooltip } from 'antd';
import { Loader, Pagination, NoContent } from 'UI';
import PlayLink from 'Shared/SessionItem/PlayLink';
import { recordingsService } from 'App/services';
import {
  checkForRecent,
  durationFromMsFormatted,
  getDateFromMill,
} from 'App/date';
import { useModal } from 'Components/Modal';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

interface Props {
  onSort: (v: string) => void;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  sessions: SessionsResponse;
  exportCSV: () => void;
}

const PER_PAGE = 10;
const sortItems = (t: TFunction) => [
  {
    key: 'timestamp',
    label: t('Newest First'),
  },
  {
    key: 'assist_duration',
    label: t('Live Duration'),
  },
  {
    key: 'call_duration',
    label: t('Call Duration'),
  },
  {
    key: 'control_duration',
    label: t('Remote Duration'),
  },
  // {
  //   key: '5',
  //   label: 'Team Member',
  // },
];

function StatsTable({
  onSort,
  isLoading,
  onPageChange,
  page,
  sessions,
  exportCSV,
}: Props) {
  const { t } = useTranslation();
  const [sortValue, setSort] = React.useState(sortItems(t)[0].label);
  const updateRange = ({ key }: { key: string }) => {
    const item = sortItems(t).find((item) => item.key === key);
    setSort(item?.label || sortItems(t)[0].label);
    item?.key && onSort(item.key);
  };

  return (
    <div className="rounded bg-white border">
      <div className="flex items-center p-4 gap-2">
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          {t('Assisted Sessions')}
        </Typography.Title>
        <div className="ml-auto" />
        <Dropdown menu={{ items: sortItems(t), onClick: updateRange }}>
          <Button size="small">
            <Space>
              <Typography.Text>{sortValue}</Typography.Text>
              <DownOutlined rev={undefined} />
            </Space>
          </Button>
        </Dropdown>
        <Button
          size="small"
          icon={<TableOutlined rev={undefined} />}
          onClick={exportCSV}
          disabled={sessions?.list.length === 0}
        >
          {t('Export CSV')}
        </Button>
      </div>
      <div className="bg-gray-lightest grid grid-cols-9 items-center font-semibold p-4">
        <Cell size={2}>{t('Date')}</Cell>
        <Cell size={2}>{t('Team Members')}</Cell>
        <Cell size={1}>{t('Live Duration')}</Cell>
        <Cell size={1}>{t('Call Duration')}</Cell>
        <Cell size={2}>{t('Remote Duration')}</Cell>
        <Cell size={1}>{/* BUTTONS */}</Cell>
      </div>
      <div className="bg-white">
        <Loader loading={isLoading} style={{ height: 300 }}>
          <NoContent
            size="small"
            title={
              <div className="text-base font-normal">
                {t('No data available')}
              </div>
            }
            show={sessions.list && sessions.list.length === 0}
            style={{ height: '100px' }}
          >
            {sessions.list.map((session) => (
              <Row session={session} />
            ))}
          </NoContent>
        </Loader>
      </div>
      <div className="flex items-center justify-between p-4">
        {sessions.total > 0 ? (
          <div>
            {t('Showing')}{' '}
            <span className="font-medium">{(page - 1) * PER_PAGE + 1}</span>
            &nbsp;{t('to')}&nbsp;
            <span className="font-medium">
              {(page - 1) * PER_PAGE + sessions.list.length}
            </span>{' '}
            {t('of')}{' '}
            <span className="font-medium">
              {numberWithCommas(sessions.total)}
            </span>{' '}
            {t('sessions.')}
          </div>
        ) : (
          <div>
            {t('Showing')}&nbsp;<span className="font-medium">0</span>&nbsp;
            {t('to')}&nbsp;
            <span className="font-medium">0</span>&nbsp;{t('of')}&nbsp;
            <span className="font-medium">0</span>&nbsp;{t('sessions.')}
          </div>
        )}
        <Pagination
          page={sessions.total > 0 ? page : 0}
          total={sessions.total}
          onPageChange={onPageChange}
          limit={10}
          debounceRequest={200}
        />
      </div>
    </div>
  );
}

function Row({ session }: { session: AssistStatsSession }) {
  const { hideModal } = useModal();

  return (
    <div className="grid grid-cols-9 p-4 border-b hover:bg-active-blue">
      <Cell size={2}>
        {checkForRecent(getDateFromMill(session.timestamp)!, 'LLL dd, hh:mm a')}
      </Cell>
      <Cell size={2}>
        <div className="flex gap-2 flex-wrap">
          {session.teamMembers.map((member) => (
            <div className="p-1 rounded border bg-gray-lightest w-fit">
              {member.name}
            </div>
          ))}
        </div>
      </Cell>
      <Cell size={1}>{durationFromMsFormatted(session.assistDuration)}</Cell>
      <Cell size={1}>{durationFromMsFormatted(session.callDuration)}</Cell>
      <Cell size={2}>{durationFromMsFormatted(session.controlDuration)}</Cell>
      <Cell size={1}>
        <div className="w-full flex justify-end gap-4">
          {session.recordings?.length > 0 ? (
            session.recordings?.length > 1 ? (
              <Dropdown
                menu={{
                  items: session.recordings.map((recording) => ({
                    key: recording.recordId,
                    label: recording.name.slice(0, 20),
                  })),
                  onClick: (item) =>
                    recordingsService.fetchRecording(
                      item.key as unknown as number,
                    ),
                }}
              >
                <CloudDownloadOutlined
                  rev={undefined}
                  style={{ fontSize: 22, color: '#8C8C8C' }}
                />
              </Dropdown>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() =>
                  recordingsService.fetchRecording(
                    session.recordings[0].recordId,
                  )
                }
              >
                <CloudDownloadOutlined
                  rev={undefined}
                  style={{ fontSize: 22, color: '#8C8C8C' }}
                />
              </div>
            )
          ) : null}
          <PlayLink
            isAssist={false}
            viewed={false}
            sessionId={session.sessionId}
            onClick={hideModal}
          />
        </div>
      </Cell>
    </div>
  );
}

function Cell({
  size,
  children,
}: {
  size: number;
  children?: React.ReactNode;
}) {
  return <div className={`col-span-${size} capitalize`}>{children}</div>;
}

export default StatsTable;

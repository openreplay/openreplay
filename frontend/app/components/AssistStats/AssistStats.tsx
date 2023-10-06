import {
  generateListData,
  defaultGraphs,
  Graphs,
  Member,
  SessionsResponse,
  PeriodKeys,
} from 'App/services/AssistStatsService';
import React from 'react';
import { Button, Typography } from 'antd';
import { FilePdfOutlined, ArrowUpOutlined } from '@ant-design/icons';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import TeamMembers from 'Components/AssistStats/components/TeamMembers';
import { Loader } from 'UI';
import { durationFromMsFormatted, formatTimeOrDate } from 'App/date'
import withPageTitle from 'HOCs/withPageTitle';
import { exportCSVFile } from 'App/utils';

import UserSearch from './components/UserSearch';
import Chart from './components/Charts';
import StatsTable from './components/Table';
import { assistStatsService } from 'App/services';

const chartNames = {
  assistTotal: 'Total Live Duration',
  assistAvg: 'Avg Live Duration',
  callTotal: 'Total Call Duration',
  callAvg: 'Avg Call Duration',
  controlTotal: 'Total Remote Duration',
  controlAvg: 'Avg Remote Duration',
};

function calculatePercentageDelta(currP: number, prevP: number) {
  return ((currP - prevP) / prevP) * 100;
}

function AssistStats() {
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [period, setPeriod] = React.useState<any>(Period({ rangeName: LAST_24_HOURS }));
  const [membersSort, setMembersSort] = React.useState('sessionsAssisted');
  const [tableSort, setTableSort] = React.useState('timestamp');
  const [topMembers, setTopMembers] = React.useState<{ list: Member[]; total: number }>({
    list: [],
    total: 0,
  });
  const [graphs, setGraphs] = React.useState<Graphs>(defaultGraphs);
  const [sessions, setSessions] = React.useState<SessionsResponse>({
    list: [],
    total: 0,
    page: 1,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    void updateData();
  }, []);

  const onChangePeriod = async (period: any) => {
    setPeriod(period);
    void updateData();
  };

  const updateData = async () => {
    setIsLoading(true);
    const topMembersPr = assistStatsService.getTopMembers({
      startTimestamp: period.start,
      endTimestamp: period.end,
      sortBy: membersSort,
      sortOrder: 'desc',
    });
    const graphsPr = assistStatsService.getGraphs(period);
    const sessionsPr = assistStatsService.getSessions({
      startTimestamp: period.start,
      endTimestamp: period.end,
      sortBy: tableSort,
      sortOrder: 'desc',
      userId: selectedUser ? selectedUser : undefined,
      page: 1,
      limit: 10,
    });
    Promise.allSettled([topMembersPr, graphsPr, sessionsPr]).then(
      ([topMembers, graphs, sessions]) => {
        topMembers.status === 'fulfilled' && setTopMembers(topMembers.value);
        graphs.status === 'fulfilled' && setGraphs(graphs.value);
        sessions.status === 'fulfilled' && setSessions(sessions.value);
        console.log(graphs, topMembers, sessions, '<><><><>');
      }
    );
    setIsLoading(false);
  };

  const onPageChange = (page: number) => {
    setPage(page);
    assistStatsService
      .getSessions({
        startTimestamp: period.start,
        endTimestamp: period.end,
        sortBy: tableSort,
        sortOrder: 'desc',
        page,
        limit: 10,
      })
      .then((sessions) => {
        setSessions(sessions);
      });
  };

  const onMembersSort = (sortBy: string) => {
    setMembersSort(sortBy);
    assistStatsService
      .getTopMembers({
        startTimestamp: period.start,
        endTimestamp: period.end,
        sortBy,
        sortOrder: 'desc',
      })
      .then((topMembers) => {
        setTopMembers(topMembers);
      });
  };

  const onTableSort = (sortBy: string) => {
    setTableSort(sortBy);
    assistStatsService
      .getSessions({
        startTimestamp: period.start,
        endTimestamp: period.end,
        sortBy,
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      })
      .then((sessions) => {
        setSessions(sessions);
      });
  };

  const exportCSV = () => {
    assistStatsService
      .getSessions({
        startTimestamp: period.start,
        endTimestamp: period.end,
        sortBy: tableSort,
        sortOrder: 'desc',
        page: 1,
        limit: 10000,
      }).then(sessions => {
      const data = sessions.list.map(s => ({
          ...s,
          members: s.teamMembers.map(m => m.name).join(', '),
          dateStr: formatTimeOrDate(s.timestamp, undefined, true),
          assistDuration: durationFromMsFormatted(s.assistDuration),
          callDuration: durationFromMsFormatted(s.callDuration),
          controlDuration: durationFromMsFormatted(s.controlDuration),
        })
      )
      const headers = [
        { label: 'Date', key: 'dateStr' },
        { label: 'Team Members', key: 'members' },
        { label: 'Live Duration', key: 'assistDuration' },
        { label: 'Call Duration', key: 'callDuration' },
        { label: 'Remote Duration', key: 'controlDuration' },
        { label: 'Session ID', key: 'sessionId' }
      ];

      exportCSVFile(headers, data, `Assist_Stats_${new Date().toLocaleDateString()}`)

    })
  };

  const onUserSelect = (id: any) => {
    setSelectedUser(id);
    assistStatsService
      .getSessions({
        startTimestamp: period.start,
        endTimestamp: period.end,
        sortBy: tableSort,
        userId: id,
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      })
      .then((sessions) => {
        setSessions(sessions);
      });
  };

  return (
    <div className={'w-full'}>
      <div className={'w-full flex items-center mb-2'}>
        <Typography.Title style={{ marginBottom: 0 }} level={4}>
          Assist Stats
        </Typography.Title>
        <div className={'ml-auto flex items-center gap-2'}>
          <UserSearch onUserSelect={onUserSelect} />

          <SelectDateRange period={period} onChange={onChangePeriod} right={true} isAnt />
          <Button shape={'default'} size={'small'} icon={<FilePdfOutlined rev={undefined} />} />
        </div>
      </div>
      <div className={'w-full grid grid-cols-3 gap-2'}>
        <div className={'grid grid-cols-3 gap-2 flex-2 col-span-2'}>
          {Object.keys(graphs.currentPeriod).map((i: PeriodKeys) => (
            <div className={'bg-white rounded border'}>
              <div className={'pt-2 px-2'}>
                <Typography.Title style={{ marginBottom: 0 }} level={5}>
                  {chartNames[i]}
                </Typography.Title>
                <div className={'flex gap-2 items-center'}>
                  <Typography.Title style={{ marginBottom: 0 }} level={5}>
                    {graphs.currentPeriod[i] ? durationFromMsFormatted(graphs.currentPeriod[i]) : 0}
                  </Typography.Title>
                  {graphs.previousPeriod[i] ? (
                    <div className={graphs.currentPeriod[i] > graphs.previousPeriod[i] ? 'flex items-center gap-1 text-green' : 'flex items-center gap-2 text-red'}>
                      <ArrowUpOutlined rev={undefined} rotate={graphs.currentPeriod[i] > graphs.previousPeriod[i] ? 0 : 180} />
                      {`${Math.round(calculatePercentageDelta(graphs.currentPeriod[i], graphs.previousPeriod[i]))}%`}
                    </div>
                  ) : null}
                </div>
              </div>
              <Loader loading={isLoading} style={{ minHeight: 90, height: 90 }} size={36}>
                <Chart data={generateListData(graphs.list, i)} label={'Test'} />
              </Loader>
            </div>
          ))}
        </div>
        <div className={'flex-1 col-span-1'}>
          <TeamMembers
            isLoading={isLoading}
            topMembers={topMembers}
            onMembersSort={onMembersSort}
          />
        </div>
      </div>
      <div className={'w-full mt-2'}>
        <StatsTable
          exportCSV={exportCSV}
          sessions={sessions}
          isLoading={isLoading}
          onSort={onTableSort}
          onPageChange={onPageChange}
          page={page}
        />
      </div>
    </div>
  );
}

export default withPageTitle('Assist Stats - Openreplay')(AssistStats);

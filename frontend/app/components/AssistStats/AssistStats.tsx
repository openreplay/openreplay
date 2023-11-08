import React from 'react';
import { Button, Typography, Tooltip } from 'antd';
import { Loader } from 'UI';
import {
  generateListData,
  defaultGraphs,
  Graphs,
  Member,
  SessionsResponse,
  PeriodKeys,
} from 'App/services/AssistStatsService';
import { FilePdfOutlined, ArrowUpOutlined } from '@ant-design/icons';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import TeamMembers from 'Components/AssistStats/components/TeamMembers';
import { durationFromMsFormatted, formatTimeOrDate } from 'App/date'
import withPageTitle from 'HOCs/withPageTitle';
import { exportCSVFile } from 'App/utils';
import { assistStatsService } from 'App/services';

import UserSearch from './components/UserSearch';
import Chart from './components/Charts';
import StatsTable from './components/Table';
import { getPdf2 } from "Components/AssistStats/pdfGenerator";

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
    void updateData(period);
  };

  const updateData = async (customPeriod?: any) => {
    const usedP = customPeriod || period;
    setIsLoading(true);
    const topMembersPr = assistStatsService.getTopMembers({
      startTimestamp: usedP.start,
      endTimestamp: usedP.end,
      userId: selectedUser ? selectedUser : undefined,
      sort: membersSort,
      order: 'desc',
    });

    const graphsPr = assistStatsService.getGraphs(usedP);
    const sessionsPr = assistStatsService.getSessions({
      startTimestamp: usedP.start,
      endTimestamp: usedP.end,
      sort: tableSort,
      order: 'desc',
      userId: selectedUser ? selectedUser : undefined,
      page: 1,
      limit: 10,
    });
    Promise.allSettled([topMembersPr, graphsPr, sessionsPr]).then(
      ([topMembers, graphs, sessions]) => {
        topMembers.status === 'fulfilled' && setTopMembers(topMembers.value);
        graphs.status === 'fulfilled' && setGraphs(graphs.value);
        sessions.status === 'fulfilled' && setSessions(sessions.value);
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
        sort: tableSort,
        order: 'desc',
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
        sort: sortBy,
        order: 'desc',
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
        sort: sortBy,
        order: 'desc',
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
        sort: tableSort,
        order: 'desc',
        page: 1,
        limit: 10000,
      }).then((sessions) => {
      const data = sessions.list.map((s) => ({
        ...s,
        members: `"${s.teamMembers.map((m) => m.name).join(', ')}"`,
        dateStr: `"${formatTimeOrDate(s.timestamp, undefined, true)}"`,
        assistDuration: `"${durationFromMsFormatted(s.assistDuration)}"`,
        callDuration: `"${durationFromMsFormatted(s.callDuration)}"`,
        controlDuration: `"${durationFromMsFormatted(s.controlDuration)}"`,
      }));
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
    setIsLoading(true);
    const topMembersPr = assistStatsService.getTopMembers({
      startTimestamp: period.start,
      endTimestamp: period.end,
      sort: membersSort,
      userId: id,
      order: 'desc',
    });

    const graphsPr = assistStatsService.getGraphs(period, id);
    const sessionsPr = assistStatsService.getSessions({
      startTimestamp: period.start,
      endTimestamp: period.end,
      sort: tableSort,
      userId: id,
      order: 'desc',
      page: 1,
      limit: 10,
    })

    Promise.allSettled([topMembersPr, graphsPr, sessionsPr]).then(
      ([topMembers, graphs, sessions]) => {
        topMembers.status === 'fulfilled' && setTopMembers(topMembers.value);
        graphs.status === 'fulfilled' && setGraphs(graphs.value);
        sessions.status === 'fulfilled' && setSessions(sessions.value);
      }
    );
    setIsLoading(false);

  };

  return (
    <div className={'w-full'}>
      <div className={'mx-auto p-4 bg-white rounded border'} style={{ maxWidth: 1360 }} id={'pdf-anchor'}>
        <div id={'pdf-ignore'} className={'w-full flex items-center mb-2'}>
          <Typography.Title style={{ marginBottom: 0 }} level={4}>
            Reports
          </Typography.Title>
          <div className={'ml-auto flex items-center gap-2'}>
            <UserSearch onUserSelect={onUserSelect} />

            <SelectDateRange period={period} onChange={onChangePeriod} right={true} isAnt />
            <Tooltip title={!sessions || sessions.total === 0 ? 'No data at the moment to export.' : 'Export PDF'}>
              <Button
                onClick={getPdf2}
                shape={'default'}
                size={'small'}
                disabled={!sessions || sessions.total === 0}
                icon={<FilePdfOutlined rev={undefined} />}
              />
            </Tooltip>
          </div>
        </div>
        <div className={'w-full grid grid-cols-3 gap-2'}>
          <div className={'grid grid-cols-3 gap-2 flex-2 col-span-2'}>
            {Object.keys(graphs.currentPeriod).map((i: PeriodKeys) => (
              <div className={'bg-white rounded border'}>
                <div className={'pt-2 px-2'}>
                  <Typography.Text strong style={{ marginBottom: 0 }}>
                    {chartNames[i]}
                  </Typography.Text>
                  <div className={'flex gap-1 items-center'}>
                    <Typography.Title style={{ marginBottom: 0 }} level={5}>
                      {graphs.currentPeriod[i]
                        ? durationFromMsFormatted(graphs.currentPeriod[i])
                        : null}
                    </Typography.Title>
                    {graphs.previousPeriod[i] ? (
                      <div
                        className={
                          graphs.currentPeriod[i] > graphs.previousPeriod[i]
                            ? 'flex items-center gap-1 text-green'
                            : 'flex items-center gap-2 text-red'
                        }
                      >
                        <ArrowUpOutlined
                          rev={undefined}
                          rotate={graphs.currentPeriod[i] > graphs.previousPeriod[i] ? 0 : 180}
                        />
                        {`${Math.round(
                          calculatePercentageDelta(
                            graphs.currentPeriod[i],
                            graphs.previousPeriod[i]
                          )
                        )}%`}
                      </div>
                    ) : null}
                  </div>
                </div>
                <Loader loading={isLoading} style={{ minHeight: 90, height: 90 }} size={36}>
                  <Chart data={generateListData(graphs.list, i)} label={chartNames[i]} />
                </Loader>
              </div>
            ))}
          </div>
          <div className={'flex-1 col-span-1'}>
            <TeamMembers
              isLoading={isLoading}
              topMembers={topMembers}
              onMembersSort={onMembersSort}
              membersSort={membersSort}
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
      <div id={'stats-layer'} />
    </div>
  );
}

export default withPageTitle('Reports - OpenReplay')(AssistStats);

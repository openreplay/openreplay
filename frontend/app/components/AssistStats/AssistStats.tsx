import { IconButton } from '@/ui/actions/IconButton';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import { TFunction } from 'i18next';
import { ArrowDown, ArrowUp, FileText } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { durationFromMsFormatted, formatTimeOrDate } from 'App/date';
import { assistStatsService } from 'App/services';
import {
  Graphs,
  Member,
  PeriodKeys,
  SessionsResponse,
  defaultGraphs,
  generateListData,
} from 'App/services/AssistStatsService';
import { exportCSVFile } from 'App/utils';
import TeamMembers from 'Components/AssistStats/components/TeamMembers';
import { getPdf2 } from 'Components/AssistStats/pdfGenerator';

import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';

import './assist-stats.css';
import Chart from './components/Charts';
import StatsTable from './components/Table';
import UserSearch from './components/UserSearch';

const chartNames = (t: TFunction) => ({
  assistTotal: t('Total Live Duration'),
  assistAvg: t('Avg Live Duration'),
  callTotal: t('Total Call Duration'),
  callAvg: t('Avg Call Duration'),
  controlTotal: t('Total Remote Duration'),
  controlAvg: t('Avg Remote Duration'),
});

function calculatePercentageDelta(currP: number, prevP: number) {
  return ((currP - prevP) / prevP) * 100;
}

function AssistStats() {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [period, setPeriod] = React.useState<any>(
    Period({ rangeName: LAST_24_HOURS }),
  );
  const [membersSort, setMembersSort] = React.useState('sessionsAssisted');
  const [tableSort, setTableSort] = React.useState('timestamp');
  const [topMembers, setTopMembers] = React.useState<{
    list: Member[];
    total: number;
  }>({
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

  /* one loader per data kind; the newest request of each kind wins, and every
     request carries the period, user and sort in effect */
  const latest = React.useRef({ members: 0, graphs: 0, sessions: 0, all: 0 });
  const loadMembers = (p: any, user: any, sort: string) => {
    const id = ++latest.current.members;
    return assistStatsService
      .getTopMembers({
        startTimestamp: p.start,
        endTimestamp: p.end,
        userId: user || undefined,
        sort,
        order: 'desc',
      })
      .then((r) => {
        if (id === latest.current.members) setTopMembers(r);
      });
  };
  const loadGraphs = (p: any, user: any) => {
    const id = ++latest.current.graphs;
    return assistStatsService.getGraphs(p, user || undefined).then((r) => {
      if (id === latest.current.graphs) setGraphs(r);
    });
  };
  const loadSessions = (p: any, user: any, sort: string, pg: number) => {
    const id = ++latest.current.sessions;
    return assistStatsService
      .getSessions({
        startTimestamp: p.start,
        endTimestamp: p.end,
        sort,
        order: 'desc',
        userId: user || undefined,
        page: pg,
        limit: 10,
      })
      .then((r) => {
        if (id === latest.current.sessions) setSessions(r);
      });
  };
  const loadAll = async (p = period, user = selectedUser) => {
    const id = ++latest.current.all;
    setIsLoading(true);
    setPage(1);
    await Promise.allSettled([
      loadMembers(p, user, membersSort),
      loadGraphs(p, user),
      loadSessions(p, user, tableSort, 1),
    ]);
    if (id === latest.current.all) setIsLoading(false);
  };

  React.useEffect(() => {
    void loadAll();
  }, []);

  const onChangePeriod = (p: any) => {
    setPeriod(p);
    void loadAll(p);
  };

  const onPageChange = (pg: number) => {
    setPage(pg);
    void loadSessions(period, selectedUser, tableSort, pg);
  };

  const onMembersSort = (sortBy: string) => {
    setMembersSort(sortBy);
    void loadMembers(period, selectedUser, sortBy);
  };

  const onTableSort = (sortBy: string) => {
    setTableSort(sortBy);
    setPage(1);
    void loadSessions(period, selectedUser, sortBy, 1);
  };

  const exportCSV = () => {
    assistStatsService
      .getSessions({
        startTimestamp: period.start,
        endTimestamp: period.end,
        sort: tableSort,
        order: 'desc',
        userId: selectedUser || undefined,
        page: 1,
        limit: 10000,
      })
      .then((sessions) => {
        const data = sessions.list.map((s) => ({
          ...s,
          members: `"${s.teamMembers.map((m) => m.name).join(', ')}"`,
          dateStr: `"${formatTimeOrDate(s.timestamp, undefined, true)}"`,
          assistDuration: `"${durationFromMsFormatted(s.assistDuration)}"`,
          callDuration: `"${durationFromMsFormatted(s.callDuration)}"`,
          controlDuration: `"${durationFromMsFormatted(s.controlDuration)}"`,
        }));
        const headers = [
          { label: t('Date'), key: 'dateStr' },
          { label: t('Team Members'), key: 'members' },
          { label: t('Live Duration'), key: 'assistDuration' },
          { label: t('Call Duration'), key: 'callDuration' },
          { label: t('Remote Duration'), key: 'controlDuration' },
          { label: t('Session ID'), key: 'sessionId' },
        ];

        exportCSVFile(
          headers,
          data,
          `Assist_Stats_${new Date().toLocaleDateString()}`,
        );
      });
  };

  const onUserSelect = (id: any) => {
    setSelectedUser(id);
    void loadAll(period, id);
  };

  return (
    <div className="m-astats" id="pdf-anchor">
      <div id="pdf-ignore" className="m-astats__head">
        <h2 className="m-astats__title">{t('Co-browsing reports')}</h2>
        <UserSearch onUserSelect={onUserSelect} />
        <SelectDateRange period={period} onChange={onChangePeriod} isAnt />
        <IconButton
          icon={<FileText size={14} />}
          label={
            !sessions || sessions.total === 0
              ? t('No data at the moment to export.')
              : t('Export PDF')
          }
          variant="ghost"
          disabled={!sessions || sessions.total === 0}
          onClick={getPdf2}
        />
      </div>
      <div className="m-astats__tiles">
        {Object.keys(graphs.currentPeriod).map((i: PeriodKeys) => {
          const cur = graphs.currentPeriod[i];
          const prev = graphs.previousPeriod[i];
          const up = cur > prev;
          return (
            <section key={i} className="m-astats__tile">
              <span className="m-astats__tile-label">{chartNames(t)[i]}</span>
              <span className="m-astats__tile-value">
                {cur ? durationFromMsFormatted(cur) : '—'}
                {prev ? (
                  <span
                    className={`m-astats__delta ${up ? 'is-up' : 'is-down'}`}
                  >
                    {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {`${Math.round(calculatePercentageDelta(cur, prev))}%`}
                  </span>
                ) : null}
              </span>
              {isLoading ? (
                <SkeletonRows rows={2} columns={[100]} />
              ) : (
                <Chart
                  data={generateListData(graphs.list, i)}
                  label={chartNames(t)[i]}
                />
              )}
            </section>
          );
        })}
      </div>
      <TeamMembers
        isLoading={isLoading}
        topMembers={topMembers}
        onMembersSort={onMembersSort}
        membersSort={membersSort}
      />
      <StatsTable
        exportCSV={exportCSV}
        sessions={sessions}
        isLoading={isLoading}
        onSort={onTableSort}
        onPageChange={onPageChange}
        page={page}
      />
    </div>
  );
}

export default AssistStats;

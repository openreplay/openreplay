import { Table } from 'antd';
import type { TableProps } from 'antd';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import FunnelIssueModal from '../FunnelIssueModal';
import FunnelIssuesListItem from '../FunnelIssuesListItem';

interface Issue {
  issueId: string;
  icon: {
    icon: string;
    color: string;
  };
  title: string;
  contextString: string;
  affectedUsers: number;
  conversionImpact: string;
  lostConversions: string;
  unaffectedSessionsPer: string;
  unaffectedSessions: string;
  affectedSessionsPer: string;
  affectedSessions: string;
  lostConversionsPer: string;
}
// Issue  |  #Users Affected  |  Conversion Impact  |  Lost Conversions
const columns: TableProps<Issue>['columns'] = [
  {
    title: 'Issue',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: '# Users Affected',
    dataIndex: 'affectedUsers',
    key: 'affectedUsers',
  },
  {
    title: 'Conversion Impact',
    dataIndex: 'conversionImpact',
    key: 'conversionImpact',
    render: (text: string) => <span>{text}%</span>,
  },
  {
    title: 'Lost Conversions',
    dataIndex: 'lostConversions',
    key: 'lostConversions',
    render: (text: string) => <span>{text}</span>,
  },
];

interface Props {
  loading?: boolean;
  issues: Issue[];
  history: any;
  location: any;
}
function FunnelIssuesList(props: RouteComponentProps<Props>) {
  const { issues, loading } = props;
  const { funnelStore } = useStore();
  const issuesSort = useObserver(() => funnelStore.issuesSort);
  const issuesFilter = useObserver(() =>
    funnelStore.issuesFilter.map((issue: any) => issue.value)
  );
  const { showModal } = useModal();
  const issueId = new URLSearchParams(props.location.search).get('issueId');

  const onIssueClick = (issue: any) => {
    props.history.replace({
      search: new URLSearchParams({ issueId: issue.issueId }).toString(),
    });
  };

  useEffect(() => {
    if (!issueId) return;

    showModal(<FunnelIssueModal issueId={issueId} />, {
      right: true,
      width: 1000,
      onClose: () => {
        if (props.history.location.pathname.includes('/metric')) {
          props.history.replace({ search: '' });
        }
      },
    });
  }, [issueId]);

  let filteredIssues = useObserver(() =>
    issuesFilter.length > 0
      ? issues.filter((issue: any) => issuesFilter.includes(issue.type))
      : issues
  );
  filteredIssues = useObserver(() =>
    issuesSort.sort
      ? filteredIssues
          .slice()
          .sort(
            (a: { [x: string]: number }, b: { [x: string]: number }) =>
              a[issuesSort.sort] - b[issuesSort.sort]
          )
      : filteredIssues
  );
  filteredIssues = useObserver(() =>
    issuesSort.order === 'desc' ? filteredIssues.reverse() : filteredIssues
  );

  return useObserver(() => (
    <NoContent
      show={!loading && filteredIssues.length === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_ISSUES} size={60} />
          <div className="mt-4">No issues found</div>
        </div>
      }
    >
      <Table
        columns={columns}
        dataSource={filteredIssues}
        onRow={(rec, ind) => ({
          onClick: () => onIssueClick(rec),
        })}
        rowClassName={'cursor-pointer'}
      />
    </NoContent>
  ));
}

export default withRouter(FunnelIssuesList);

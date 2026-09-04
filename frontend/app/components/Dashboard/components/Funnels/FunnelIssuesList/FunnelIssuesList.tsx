import { InfoCircleOutlined } from '@ant-design/icons';
import { Table, Typography } from 'antd';
import type { TableProps } from 'antd';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { RouteComponentProps, withRouter } from 'App/routing';
import { NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import FunnelIssueModal from '../FunnelIssueModal';
import FunnelIssuesListItem from '../FunnelIssuesListItem';

const { Text } = Typography;

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
const columns: (t: TFunction) => TableProps<Issue>['columns'] = (t) => [
  {
    title: t('Issue'),
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: t('Page / Element'),
    dataIndex: 'contextString',
    key: 'contextString',
    render: (text: string) => (
      <Text
        ellipsis
        style={{
          width: 200, // Adjust width here as needed
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </Text>
    ),
    width: 200,
  },
  {
    title: t('# Users Affected'),
    dataIndex: 'affectedUsers',
    key: 'affectedUsers',
  },
  {
    title: t('Conversion Impact'),
    dataIndex: 'conversionImpact',
    key: 'conversionImpact',
    render: (text: string) => <span>{text}%</span>,
  },
  {
    title: t('Lost Conversions'),
    dataIndex: 'lostConversions',
    key: 'lostConversions',
    render: (text: string) => <span>{text}</span>,
  },
];

interface Props extends RouteComponentProps {
  loading?: boolean;
  issues: Issue[];
  history: any;
  location: any;
}
function FunnelIssuesList(props: Props) {
  const { t } = useTranslation();
  const { issues, loading } = props;
  const { funnelStore } = useStore();
  const issuesSort = funnelStore.issuesSort;
  const issuesFilter = funnelStore.issuesFilter.map(
    (issue: any) => issue.value,
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

  let filteredIssues =
    issuesFilter.length > 0
      ? issues.filter((issue: any) => issuesFilter.includes(issue.type))
      : issues;
  filteredIssues = issuesSort.sort
    ? filteredIssues
        .slice()
        .sort(
          (a: { [x: string]: number }, b: { [x: string]: number }) =>
            a[issuesSort.sort] - b[issuesSort.sort],
        )
    : filteredIssues;
  filteredIssues =
    issuesSort.order === 'desc' ? filteredIssues.reverse() : filteredIssues;

  return (
    <NoContent
      show={!loading && filteredIssues.length === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_ISSUES} size={60} />
          <div className="mt-4 text-base">
            <InfoCircleOutlined />
            &nbsp;{t('No issues found')}
          </div>
        </div>
      }
    >
      <Table
        columns={columns(t)}
        dataSource={filteredIssues}
        onRow={(rec, ind) => ({
          onClick: () => onIssueClick(rec),
        })}
        rowClassName="cursor-pointer"
      />
    </NoContent>
  );
}

export default withRouter(observer(FunnelIssuesList));

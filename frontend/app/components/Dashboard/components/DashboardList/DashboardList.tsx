import { LockOutlined, TeamOutlined } from '@ant-design/icons';
import { Switch, Table, TableColumnsType, Tag, Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { checkForRecent } from 'App/date';
import { useStore } from 'App/mstore';
import Dashboard from 'App/mstore/types/dashboard';
import { dashboardSelected, withSiteId } from 'App/routes';
import { NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function DashboardList({ history, siteId }: { history: any; siteId: string }) {
  const { dashboardStore } = useStore();
  const list = dashboardStore.filteredList;
  const dashboardsSearch = dashboardStore.filter.query;
  const lenth = list.length;


  const tableConfig: TableColumnsType<Dashboard> = [
    {
      title: 'Title',
      dataIndex: 'name',
      width: '25%',
      render: (t) => <div className="link capitalize-first">{t}</div>,
    },
    {
      title: 'Description',
      ellipsis: {
        showTitle: false,
      },
      width: '25%',
      dataIndex: 'description',
    },
    {
      title: 'Last Modified',
      dataIndex: 'updatedAt',
      width: '16.67%',
      sorter: (a, b) => a.updatedAt.toMillis() - b.updatedAt.toMillis(),
      sortDirections: ['ascend', 'descend'],
      render: (date) => checkForRecent(date, 'LLL dd, yyyy, hh:mm a'),
    },
    {
      title: 'Modified By',
      dataIndex: 'updatedBy',
      width: '16.67%',
      sorter: (a, b) => a.updatedBy.localeCompare(b.updatedBy),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: (
        <div className={'flex items-center justify-between'}>
          <div>Visibility</div>
          <Switch checked={!dashboardStore.filter.showMine} onChange={() =>
            dashboardStore.updateKey('filter', {
              ...dashboardStore.filter,
              showMine: !dashboardStore.filter.showMine,
            })} checkedChildren={'Public'} unCheckedChildren={'Private'} />
        </div>
      ),
      width: '16.67%',
      dataIndex: 'isPublic',
      render: (isPublic: boolean) => (
        <Tag icon={isPublic ? <TeamOutlined /> : <LockOutlined />}>
          {isPublic ? 'Team' : 'Private'}
        </Tag>
      ),
    },
  ];
  return (
    <NoContent
      show={lenth === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_DASHBOARDS} size={180} />
          <div className="text-center mt-4">
            {dashboardsSearch !== ''
              ? 'No matching results'
              : "You haven't created any dashboards yet"}
          </div>
        </div>
      }
      subtext={
        <div>
          A Dashboard is a collection of{' '}
          <Tooltip
            title={
              <div className="text-center">
                Utilize cards to visualize key user interactions or product
                performance metrics.
              </div>
            }
            className="text-center"
          >
            <span className="underline decoration-dotted">Cards</span>
          </Tooltip>{' '}
          that can be shared across teams.
        </div>
      }
    >
      <Table
        dataSource={list}
        columns={tableConfig}
        pagination={{
          showTotal: (total, range) =>
            `Showing ${range[0]}-${range[1]} of ${total} items`,
          size: 'small',
        }}
        onRow={(record) => ({
          onClick: () => {
            dashboardStore.selectDashboardById(record.dashboardId);
            const path = withSiteId(
              dashboardSelected(record.dashboardId),
              siteId
            );
            history.push(path);
          },
        })}
      />
    </NoContent>
  );
}

export default connect((state: any) => ({
  siteId: state.getIn(['site', 'siteId']),
}))(withRouter(observer(DashboardList)));

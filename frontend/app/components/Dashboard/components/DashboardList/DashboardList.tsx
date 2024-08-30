import { LockOutlined, TeamOutlined } from '@ant-design/icons';
import {
  Empty,
  Switch,
  Table,
  TableColumnsType,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router';

import { checkForRecent } from 'App/date';
import { useStore } from 'App/mstore';
import Dashboard from 'App/mstore/types/dashboard';
import { dashboardSelected, withSiteId } from 'App/routes';
import CreateDashboardButton from 'Components/Dashboard/components/CreateDashboardButton';
import { ItemMenu, confirm } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import DashboardEditModal from '../DashboardEditModal';

function DashboardList({ siteId }: { siteId: string }) {
  const [focusTitle, setFocusedInput] = React.useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);

  const { dashboardStore } = useStore();
  const list = dashboardStore.filteredList;
  const dashboardsSearch = dashboardStore.filter.query;
  const history = useHistory();

  // Define custom width and height for each scenario
  const searchImageDimensions = { width: 60, height: 'auto' };
  const defaultImageDimensions = { width: 600, height: 'auto' };

  const onEdit = (id: string, isTitle: boolean) => {
    const dashboard = dashboardStore.getDashboard(id);
    if (!dashboard) return;
    dashboardStore.initDashboard(dashboard);
    setFocusedInput(isTitle);
    setShowEditModal(true);
  };

  const onDelete = async (id: string) => {
    const dashboard = dashboardStore.getDashboard(id);
    if (!dashboard) return;
    if (
      await confirm({
        header: 'Delete Dashboard',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this Dashboard?`,
      })
    ) {
      void dashboardStore.deleteDashboard(dashboard);
    }
  };

  const tableConfig: TableColumnsType<Dashboard> = [
    {
      title: 'Title',
      dataIndex: 'name',
      width: '25%',
      sorter: (a, b) => a.name?.localeCompare(b.name),
      sortDirections: ['ascend', 'descend'],
      render: (t) => <div className="link cap-first">{t}</div>,
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      width: '16.67%',
      sorter: (a, b) => a.owner?.localeCompare(b.owner),
      sortDirections: ['ascend', 'descend'],
      render: (owner) => <div className="cap-first">{owner}</div>,
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
      title: (
        <div className={'flex items-center justify-start gap-2'}>
          <div>Visibility</div>
          <Tooltip
            title="Toggle to view your dashboards or all team dashboards."
            placement="topRight"
          >
            <Switch
              checked={!dashboardStore.filter.showMine}
              onChange={() =>
                dashboardStore.updateKey('filter', {
                  ...dashboardStore.filter,
                  showMine: !dashboardStore.filter.showMine,
                })
              }
              checkedChildren={'Team'}
              unCheckedChildren={'Private'}
            />
          </Tooltip>
        </div>
      ),
      width: '16.67%',
      dataIndex: 'isPublic',
      render: (isPublic: boolean) => (
        <Tag
          icon={isPublic ? <TeamOutlined /> : <LockOutlined />}
          bordered={false}
          className="rounded-lg"
        >
          {isPublic ? 'Team' : 'Private'}
        </Tag>
      ),
    },

    {
      title: 'Options',
      dataIndex: 'dashboardId',
      width: '5%',
      onCell: () => ({ onClick: (e) => e.stopPropagation() }),
      render: (id) => (
        <ItemMenu
          bold
          items={[
            { icon: 'pencil', text: 'Rename', onClick: () => onEdit(id, true) },
            {
              icon: 'users',
              text: 'Visibility & Access',
              onClick: () => onEdit(id, false),
            },
            { icon: 'trash', text: 'Delete', onClick: () => onDelete(id) },
          ]}
        />
      ),
    },
  ];

  const emptyDescription =
    dashboardsSearch !== '' ? (
      <div className="text-center">
        <div>
          <Typography.Text className="my-2 text-lg font-medium">
            No matching results
          </Typography.Text>
          <div className="mb-2 text-lg text-gray-500 mt-2 leading-normal">
            Try adjusting your search criteria or creating a new dashboard.
          </div>
        </div>
      </div>
    ) : (
      <div className="text-center">
        <div>
          <Typography.Text className="my-2 text-xl font-medium">
            Create your first dashboard.
          </Typography.Text>
          <div className="mb-2 text-lg text-gray-500 mt-2 leading-normal">
            Organize your product and technical insights as cards in dashboards
            to see the bigger picture.
          </div>
          <div className="my-4">
            <CreateDashboardButton />
          </div>
        </div>
      </div>
    );

  const emptyImage =
    dashboardsSearch !== '' ? ICONS.NO_RESULTS : ICONS.NO_DASHBOARDS;
  const imageDimensions =
    dashboardsSearch !== '' ? searchImageDimensions : defaultImageDimensions;

  return list.length === 0 && !dashboardStore.filter.showMine ? (
    <div className="flex justify-center text-center">
      <Empty
        image={<AnimatedSVG name={emptyImage} size={imageDimensions.width} />}
        imageStyle={{
          width: imageDimensions.width,
          height: imageDimensions.height,
          margin: 'auto',
          padding: '2rem 0',
        }}
        description={emptyDescription}
      />
    </div>
  ) : (
    <>
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
      <DashboardEditModal
        show={showEditModal}
        closeHandler={() => setShowEditModal(false)}
        focusTitle={focusTitle}
      />
    </>
  );
}

export default connect((state: any) => ({
  siteId: state.getIn(['site', 'siteId']),
}))(observer(DashboardList));

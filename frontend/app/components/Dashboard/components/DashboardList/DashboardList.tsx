import { observer } from 'mobx-react-lite';
import React from 'react';
import { useHistory } from 'react-router';
import {
  Empty,
  Switch,
  Table,
  TableColumnsType,
  Tag,
  Tooltip,
  Typography,
  Dropdown,
  Button,
} from 'antd';
import { LockOutlined, TeamOutlined, MoreOutlined } from '@ant-design/icons';
import { checkForRecent } from 'App/date';
import { useStore } from 'App/mstore';
import Dashboard from 'App/mstore/types/dashboard';
import { dashboardSelected, withSiteId } from 'App/routes';
import CreateDashboardButton from 'Components/Dashboard/components/CreateDashboardButton';
import { Icon, confirm } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import DashboardEditModal from '../DashboardEditModal';
import { useTranslation } from 'react-i18next';

function DashboardList() {
  const { t } = useTranslation();
  const { dashboardStore, projectsStore } = useStore();
  const { siteId } = projectsStore;
  const optionsRef = React.useRef<HTMLDivElement>(null);
  const [focusTitle, setFocusedInput] = React.useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);

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
        header: t('Delete Dashboard'),
        confirmButton: t('Yes, delete'),
        confirmation: t(
          'Are you sure you want to permanently delete this Dashboard?',
        ),
      })
    ) {
      void dashboardStore.deleteDashboard(dashboard);
    }
  };

  const tableConfig: TableColumnsType<Dashboard> = [
    {
      title: t('Title'),
      dataIndex: 'name',
      width: '25%',
      sorter: (a, b) => a.name?.localeCompare(b.name),
      sortDirections: ['ascend', 'descend'],
      render: (t) => <div className="link cap-first">{t}</div>,
    },
    {
      title: t('Owner'),
      dataIndex: 'owner',
      width: '16.67%',
      sorter: (a, b) => a.owner?.localeCompare(b.owner),
      sortDirections: ['ascend', 'descend'],
      render: (owner) => <div className="cap-first">{owner}</div>,
    },
    {
      title: t('Last Modified'),
      dataIndex: 'updatedAt',
      width: '16.67%',
      sorter: (a, b) => a.updatedAt.toMillis() - b.updatedAt.toMillis(),
      sortDirections: ['ascend', 'descend'],
      render: (date) => checkForRecent(date, 'LLL dd, yyyy, hh:mm a'),
    },

    {
      title: (
        <div className="flex items-center justify-start gap-2">
          <div>{t('Visibility')}</div>
          <Tooltip
            title={t('Toggle to view your dashboards or all team dashboards.')}
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
              checkedChildren="Team"
              unCheckedChildren="Private"
              className="toggle-team-private"
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
          {isPublic ? t('Team') : t('Private')}
        </Tag>
      ),
    },

    {
      title: '',
      dataIndex: 'dashboardId',
      width: '5%',
      render: (id) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            arrow={false}
            trigger={['click']}
            className="ignore-prop-dp"
            menu={{
              items: [
                {
                  icon: <Icon name="pencil" />,
                  key: 'rename',
                  label: t('Rename'),
                },
                {
                  icon: <Icon name="users" />,
                  key: 'access',
                  label: t('Visibility & Access'),
                },
                {
                  icon: <Icon name="trash" />,
                  key: 'delete',
                  label: t('Delete'),
                },
              ],
              onClick: async ({ key }) => {
                if (key === 'rename') {
                  onEdit(id, true);
                } else if (key === 'access') {
                  onEdit(id, false);
                } else if (key === 'delete') {
                  await onDelete(id);
                }
              },
            }}
          >
            <Button
              id="ignore-prop"
              icon={<MoreOutlined />}
              type="text"
              className="btn-dashboards-list-item-more-options"
            />
          </Dropdown>
        </div>
      ),
    },
  ];

  const emptyDescription =
    dashboardsSearch !== '' ? (
      <div className="text-center">
        <div>
          <Typography.Text className="my-2 text-lg font-medium">
            {t('No matching results')}
          </Typography.Text>
          <div className="mb-2 text-lg text-gray-500 my-3 leading-normal">
            {t(
              'Try adjusting your search criteria or creating a new dashboard.',
            )}
          </div>
        </div>
      </div>
    ) : (
      <div className="text-center">
        <div>
          <Typography.Text className="my-2 text-lg font-medium">
            {t('Create and organize your insights')}
          </Typography.Text>
          <div className="mb-2 text-lg text-gray-500 leading-normal">
            {t('Build dashboards to track key metrics and monitor performance in one place.')}
          </div>
          <div className="my-4 mb-10">
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
        showSorterTooltip={false}
        pagination={{
          showTotal: (total, range) =>
            `${t('Showing')} ${range[0]}-${range[1]} ${t('of')} ${total} ${t('items')}`,
          size: 'small',
          simple: 'true',
          className: 'px-4 pr-8 mb-0',
        }}
        onRow={(record) => ({
          onClick: (e) => {
            const possibleDropdown =
              document.querySelector('.ant-dropdown-menu');
            const btn = document.querySelector('#ignore-prop');
            if (
              e.target.classList.contains('lucide') ||
              e.target.id === 'ignore-prop' ||
              possibleDropdown?.contains(e.target) ||
              btn?.contains(e.target)
            ) {
              return;
            }
            dashboardStore.selectDashboardById(record.dashboardId);
            const path = withSiteId(
              dashboardSelected(record.dashboardId),
              siteId,
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

export default observer(DashboardList);

import React from 'react';
import BackButton from 'Shared/Breadcrumb/BackButton';
import { withSiteId } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { PageTitle, confirm } from 'UI';
import { Tooltip, Popover, Button  } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import DashboardOptions from '../DashboardOptions';
import withModal from 'App/components/Modal/withModal';
import { observer } from 'mobx-react-lite';
import DashboardEditModal from '../DashboardEditModal';
import AddCardSection from '../AddCardSection/AddCardSection';

interface IProps {
  siteId: string;
  renderReport?: any;
}

type Props = IProps & RouteComponentProps;

function DashboardHeader(props: Props) {
  const { siteId } = props;
  const { dashboardStore } = useStore();
  const [focusTitle, setFocusedInput] = React.useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const period = dashboardStore.period;

  const dashboard: any = dashboardStore.selectedDashboard;

  const onEdit = (isTitle: boolean) => {
    dashboardStore.initDashboard(dashboard);
    setFocusedInput(isTitle);
    setShowEditModal(true);
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Delete Dashboard',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this Dashboard?`,
      })
    ) {
      dashboardStore.deleteDashboard(dashboard).then(() => {
        props.history.push(withSiteId(`/dashboard`, siteId));
      });
    }
  };
  return (
    <>
      <DashboardEditModal
        show={showEditModal}
        closeHandler={() => setShowEditModal(false)}
        focusTitle={focusTitle}
      />


      <div className="flex items-center justify-between px-4 pt-4  bg-white">
        <div className="flex items-center gap-2" style={{ flex: 3 }}>
          <BackButton siteId={siteId} compact />

          <PageTitle
            title={
              // @ts-ignore
              <Tooltip
                title="Click to edit"
                placement="bottom"
              >
               <div className='text-2xl h-8 flex items-center p-2 rounded-lg cursor-pointer select-none ps-2 hover:bg-teal/10'> {dashboard?.name}</div>
              </Tooltip>
            }
            onClick={() => onEdit(true)}
            className="mr-3 select-none border-b border-b-borderColor-transparent hover:border-dashed hover:border-gray-medium cursor-pointer"
          />
        </div>
        <div
          className="flex items-center gap-2"
          style={{ flex: 1, justifyContent: 'end' }}
        >

        <Popover
            trigger="click"
            content={<AddCardSection />}
            overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }}
          >
            <Button type="primary"  icon={<PlusOutlined />} size="middle">
              Add Card
            </Button>
          </Popover>

          <SelectDateRange
            style={{ width: '300px' }}
            period={period}
            onChange={(period: any) => dashboardStore.setPeriod(period)}
            right={true}
            isAnt={true}
            useButtonStyle={true}
            className='h-full'
          />

          <DashboardOptions
            editHandler={onEdit}
            deleteHandler={onDelete}
            renderReport={props.renderReport}
            isTitlePresent={!!dashboard?.description}
          />
        </div>
      </div>
    </>
  );
}

export default withRouter(withModal(observer(DashboardHeader)));

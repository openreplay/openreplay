import React from 'react';
import Breadcrumb from 'Shared/Breadcrumb';
import { withSiteId } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { Button, PageTitle, confirm, Tooltip } from 'UI';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { useModal } from 'App/components/Modal';
import DashboardOptions from '../DashboardOptions';
import withModal from 'App/components/Modal/withModal';
import { observer } from 'mobx-react-lite';
import DashboardEditModal from '../DashboardEditModal';
import AddCardModal from '../AddCardModal';

interface IProps {
  dashboardId: string;
  siteId: string;
  renderReport?: any;
}

type Props = IProps & RouteComponentProps;
const MAX_CARDS = 29;
function DashboardHeader(props: Props) {
  const { siteId, dashboardId } = props;
  const { dashboardStore } = useStore();
  const { showModal } = useModal();
  const [focusTitle, setFocusedInput] = React.useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const period = dashboardStore.period;

  const dashboard: any = dashboardStore.selectedDashboard;
  const canAddMore: boolean = dashboard?.widgets?.length <= MAX_CARDS;

  const onEdit = (isTitle: boolean) => {
    dashboardStore.initDashboard(dashboard);
    setFocusedInput(isTitle);
    setShowEditModal(true);
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Confirm',
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
    <div>
      <DashboardEditModal
        show={showEditModal}
        closeHandler={() => setShowEditModal(false)}
        focusTitle={focusTitle}
      />
      <Breadcrumb
        items={[
          {
            label: 'Dashboards',
            to: withSiteId('/dashboard', siteId),
          },
          { label: (dashboard && dashboard.name) || '' },
        ]}
      />
      <div className="flex items-center mb-2 justify-between">
        <div className="flex items-center" style={{ flex: 3 }}>
          <PageTitle
            title={
              // @ts-ignore
              <Tooltip delay={100} arrow title="Double click to edit">
                {dashboard?.name}
              </Tooltip>
            }
            onDoubleClick={() => onEdit(true)}
            className="mr-3 select-none border-b border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium cursor-pointer"
          />
        </div>
        <div className="flex items-center" style={{ flex: 1, justifyContent: 'end' }}>
          <Tooltip delay={0} disabled={canAddMore} title="The number of cards in one dashboard is limited to 30.">
            <Button
              disabled={!canAddMore}
              variant="primary"
              onClick={() =>
                showModal(<AddCardModal dashboardId={dashboardId} siteId={siteId} />, { right: true })
              }
              icon="plus"
              iconSize={24}
            >
              Add Card
            </Button>
          </Tooltip>
          <div className="mx-4"></div>
          <div
            className="flex items-center flex-shrink-0 justify-end"
            style={{ width: 'fit-content' }}
          >
            <SelectDateRange
              style={{ width: '300px' }}
              period={period}
              onChange={(period: any) => dashboardStore.setPeriod(period)}
              right={true}
            />
          </div>
          <div className="mx-4" />
          <div className="flex items-center flex-shrink-0">
            <DashboardOptions
              editHandler={onEdit}
              deleteHandler={onDelete}
              renderReport={props.renderReport}
              isTitlePresent={!!dashboard?.description}
            />
          </div>
        </div>
      </div>
      <div className="pb-4">
        {/* @ts-ignore */}
        <Tooltip delay={100} arrow title="Double click to edit" className="w-fit !block">
          <h2
            className="my-2 font-normal w-fit text-disabled-text border-b border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium cursor-pointer"
            onDoubleClick={() => onEdit(false)}
          >
            {dashboard?.description || 'Describe the purpose of this dashboard'}
          </h2>
        </Tooltip>
      </div>
    </div>
  );
}

export default withRouter(withModal(observer(DashboardHeader)));

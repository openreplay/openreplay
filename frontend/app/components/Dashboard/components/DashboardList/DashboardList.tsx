import { observer } from 'mobx-react-lite';
import React from 'react';
import { NoContent, Pagination } from 'UI';
import { useStore } from 'App/mstore';
import { sliceListPerPage } from 'App/utils';
import DashboardListItem from './DashboardListItem';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Tooltip } from 'antd';

function DashboardList() {
  const { dashboardStore } = useStore();
  const list = dashboardStore.filteredList;
  const dashboardsSearch = dashboardStore.filter.query;
  const lenth = list.length;

  return (
    <NoContent
      show={lenth === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_DASHBOARDS} size={180} />
          <div className="text-center mt-4">
            {dashboardsSearch !== '' ? 'No matching results' : "You haven't created any dashboards yet"}
          </div>
        </div>
      }
      subtext={
        <div>
          A Dashboard is a collection of <Tooltip title={<div className="text-center">Utilize cards to visualize key user interactions or product performance metrics.</div>} className="text-center"><span className="underline decoration-dotted">Cards</span></Tooltip> that can be shared across teams.
        </div>
      }
    >
      <div className="mt-3 border-b">
        <div className="grid grid-cols-12 py-2 font-medium px-6">
          <div className="col-span-8">Title</div>
          <div className="col-span-2">Visibility</div>
          <div className="col-span-2 text-right">Creation Date</div>
        </div>

        {sliceListPerPage(list, dashboardStore.page - 1, dashboardStore.pageSize).map(
          (dashboard: any) => (
            <React.Fragment key={dashboard.dashboardId}>
              <DashboardListItem dashboard={dashboard} />
            </React.Fragment>
          )
        )}
      </div>

      <div className="w-full flex items-center justify-between pt-4 px-6">
        <div className="text-disabled-text">
          Showing{' '}
          <span className="font-semibold">{Math.min(list.length, dashboardStore.pageSize)}</span>{' '}
          out of <span className="font-semibold">{list.length}</span> Dashboards
        </div>
        <Pagination
          page={dashboardStore.page}
          totalPages={Math.ceil(lenth / dashboardStore.pageSize)}
          onPageChange={(page) => dashboardStore.updateKey('page', page)}
          limit={dashboardStore.pageSize}
          debounceRequest={100}
        />
      </div>
    </NoContent>
  );
}

export default observer(DashboardList);

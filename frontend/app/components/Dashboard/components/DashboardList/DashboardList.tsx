import { observer } from 'mobx-react-lite';
import React from 'react';
import { NoContent, Pagination, Icon } from 'UI';
import { useStore } from 'App/mstore';
import { filterList } from 'App/utils';
import { sliceListPerPage } from 'App/utils';
import DashboardListItem from './DashboardListItem';

function DashboardList() {
  const { dashboardStore } = useStore();
  const [shownDashboards, setDashboards] = React.useState([]);
  const dashboards = dashboardStore.dashboards;
  const dashboardsSearch = dashboardStore.dashboardsSearch;

  React.useEffect(() => {
    setDashboards(filterList(dashboards, dashboardsSearch, ['name', 'owner', 'description']));
  }, [dashboardsSearch]);

  const list = dashboardsSearch !== '' ? shownDashboards : dashboards;
  const lenth = list.length;

  return (
    <NoContent
      show={lenth === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <Icon name="no-dashboard" size={80} color="figmaColors-accent-secondary" />
          <div className="text-center text-gray-600 my-4">
            {dashboardsSearch !== ''
              ? 'No matching results'
              : "You haven't created any dashboards yet"}
          </div>
        </div>
      }
    >
      <div className="mt-3 border-b">
        <div className="grid grid-cols-12 py-2 font-medium px-6">
          <div className="col-span-8">Title</div>
          <div className="col-span-2">Visibility</div>
          <div className="col-span-2 text-right">Created</div>
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

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Loader } from 'UI';
import WidgetWrapper from 'App/components/Dashboard/components/WidgetWrapper';
import { useStore } from 'App/mstore';
import { useModal } from 'App/components/Modal';
import { dashboardMetricCreate, withSiteId } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';

interface IProps extends RouteComponentProps {
  siteId: string;
  title: string;
  description: string;
}

function AddMetric({ history, siteId, title, description }: IProps) {
  const [metrics, setMetrics] = React.useState<Record<string, any>[]>([]);

  const { dashboardStore } = useStore();
  const { hideModal } = useModal();

  React.useEffect(() => {
    dashboardStore?.fetchTemplates(true).then((cats: any[]) => {
      const customMetrics = cats.find((category) => category.name === 'custom')?.widgets || [];

      setMetrics(customMetrics);
    });
  }, []);

  const dashboard = dashboardStore.selectedDashboard;
  const selectedWidgetIds = dashboardStore.selectedWidgets.map((widget: any) => widget.metricId);
  const queryParams = new URLSearchParams(location.search);

  const onSave = () => {
    if (selectedWidgetIds.length === 0) return;
    dashboardStore
      .save(dashboard)
      .then(async (syncedDashboard: Record<string, any>) => {
        if (dashboard.exists()) {
          await dashboardStore.fetch(dashboard.dashboardId);
        }
        dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
      })
      .then(hideModal);
  };

  const onCreateNew = () => {
    const path = withSiteId(dashboardMetricCreate(dashboard.dashboardId), siteId);
    if (!queryParams.has('modal')) history.push('?modal=addMetric');
    history.push(path);
    hideModal();
  };

  return (
    <div style={{ maxWidth: '85vw', width: 1200 }}>
      <div
        className="border-l shadow h-screen"
        style={{ backgroundColor: '#FAFAFA', zIndex: 999, width: '100%' }}
      >
        <div className="mb-6 pt-8 px-8 flex items-start justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl">{title}</h1>
            <div className="text-disabled-text">{description}</div>
          </div>

          <Button variant="text-primary" className="font-medium ml-2" onClick={onCreateNew}>
            + Create New
          </Button>
        </div>
        <Loader loading={dashboardStore.loadingTemplates}>
          <div
            className="grid h-full grid-cols-4 gap-4 px-8 items-start py-1"
            style={{
              maxHeight: 'calc(100vh - 160px)',
              overflowY: 'auto',
              gridAutoRows: 'max-content',
            }}
          >
            {metrics ? (
              metrics.map((metric: any) => (
                <WidgetWrapper
                  key={metric.metricId}
                  widget={metric}
                  active={selectedWidgetIds.includes(metric.metricId)}
                  isTemplate={true}
                  isWidget={metric.metricType === 'predefined'}
                  onClick={() => dashboardStore.toggleWidgetSelection(metric)}
                />
              ))
            ) : (
              <div>No custom metrics created.</div>
            )}
          </div>
        </Loader>

        <div className="py-4 border-t px-8 bg-white w-full flex items-center justify-between">
          <div>
            {'Selected '}
            <span className="font-semibold">{selectedWidgetIds.length}</span>
            {' out of '}
            <span className="font-semibold">{metrics ? metrics.length : 0}</span>
          </div>
          <Button variant="primary" disabled={selectedWidgetIds.length === 0} onClick={onSave}>
            Add Selected
          </Button>
        </div>
      </div>
    </div>
  );
}

export default withRouter(observer(AddMetric));

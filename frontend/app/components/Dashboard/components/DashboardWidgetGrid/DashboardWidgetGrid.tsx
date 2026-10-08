import { EmptyState } from '@/ui/feedback/EmptyState';
import { Loader } from '@/ui/feedback/Loader';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import WidgetWrapperNew from 'Components/Dashboard/components/WidgetWrapper/WidgetWrapperNew';

interface Props {
  siteId: string;
  id?: string;
  addCard: React.ReactNode;
}

function DashboardWidgetGrid({ siteId, id, addCard }: Props) {
  const { t } = useTranslation();
  const { dashboardStore } = useStore();
  const dashboard = dashboardStore.selectedDashboard;
  const list = dashboard?.widgets ?? [];

  return (
    <Loader loading={dashboardStore.isLoading}>
      {list.length === 0 ? (
        <div className="m-panel">
          <EmptyState
            art="dashboard"
            title={t('Nothing on this dashboard yet')}
            hint={t(
              'Add a card from the library and it takes its place in the grid.',
            )}
            action={addCard}
          />
        </div>
      ) : (
        <div className="m-dash__grid" id={id}>
          {list.map((item: any, index: number) => (
            <WidgetWrapperNew
              key={item.widgetId}
              index={index}
              widget={item}
              siteId={siteId}
              moveListItem={(from, to) =>
                dashboard?.swapWidgetPosition(from, to)
              }
            />
          ))}
        </div>
      )}
    </Loader>
  );
}

export default observer(DashboardWidgetGrid);

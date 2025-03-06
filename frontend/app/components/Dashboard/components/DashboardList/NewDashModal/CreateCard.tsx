import React from 'react';
import { Button, Space } from 'antd';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useHistory } from 'react-router';
import { useStore } from 'App/mstore';
import { HEATMAP } from 'App/constants/card';
import { renderClickmapThumbnail } from 'Components/Dashboard/components/WidgetForm/renderMap';
import WidgetPreview from 'Components/Dashboard/components/WidgetPreview/WidgetPreview';
import WidgetFormNew from 'Components/Dashboard/components/WidgetForm/WidgetFormNew';
import { useTranslation } from 'react-i18next';

interface Props {
  // cardType: string,
  onBack?: () => void;
  onAdded?: () => void;
  extra?: React.ReactNode;
}

function CreateCard(props: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const { metricStore, dashboardStore, aiFiltersStore } = useStore();
  const metric = metricStore.instance;
  const siteId: string = history.location.pathname.split('/')[1];
  const dashboardId: string = history.location.pathname.split('/')[3];
  const isItDashboard = history.location.pathname.includes('dashboard');
  // const title = getTitleByType(metric.metricType)

  const createNewDashboard = async () => {
    dashboardStore.initDashboard();
    return await dashboardStore
      .save(dashboardStore.dashboardInstance)
      .then(async (syncedDashboard) => {
        dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
        return syncedDashboard.dashboardId;
      });
  };

  const addCardToDashboard = async (dashboardId: string, metricId: string) =>
    dashboardStore.addWidgetToDashboard(
      dashboardStore.getDashboard(parseInt(dashboardId, 10))!,
      [metricId],
    );

  const createCard = async () => {
    const isClickMap = metric.metricType === HEATMAP;
    if (isClickMap) {
      try {
        metric.thumbnail = await renderClickmapThumbnail();
      } catch (e) {
        console.error(e);
      }
    }

    const savedMetric = await metricStore.save(metric);
    return savedMetric.metricId;
  };

  const createDashboardAndAddCard = async () => {
    const cardId = await createCard();

    if (dashboardId) {
      await addCardToDashboard(dashboardId, cardId);
      void dashboardStore.fetch(dashboardId);
      props.onAdded?.();
    } else if (isItDashboard) {
      const dashboardId = await createNewDashboard();
      await addCardToDashboard(dashboardId, cardId);
      history.replace(`${history.location.pathname}/${dashboardId}`);
    } else {
      history.replace(`${history.location.pathname}/${cardId}`);
    }
  };

  return (
    <div className="flex gap-4 flex-col">
      <div className="flex items-center justify-between">
        <Space>
          {props.onBack ? (
            <Button type="text" onClick={props.onBack}>
              <ArrowLeft size={16} />
            </Button>
          ) : null}
          <div className="text-xl leading-4 font-medium">{metric.name}</div>
        </Space>
        <Button type="primary" onClick={createDashboardAndAddCard}>
          <Space>
            {t('Create')} <ArrowRight size={14} />
          </Space>
        </Button>
      </div>
      {props.extra}
      {/* <CardBuilder siteId={siteId}/> */}
      <WidgetFormNew />
      <WidgetPreview className="" name={metric.name} isEditing />
    </div>
  );
}

export default CreateCard;

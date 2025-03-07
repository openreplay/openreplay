import React from 'react';
import { Button, Space } from 'antd';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useStore } from 'App/mstore';
import { HEATMAP } from 'App/constants/card';
import { renderClickmapThumbnail } from 'Components/Dashboard/components/WidgetForm/renderMap';
import WidgetPreview from 'Components/Dashboard/components/WidgetPreview/WidgetPreview';
import WidgetFormNew from 'Components/Dashboard/components/WidgetForm/WidgetFormNew';

interface Props {
  onBack?: () => void;
  onAdded?: () => void;
  extra?: React.ReactNode;
}

function CreateCard(props: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { metricStore, dashboardStore } = useStore();
  const metric = metricStore.instance;
  const dashboardId: string = location.pathname.split('/')[3];
  const isItDashboard = location.pathname.includes('dashboard');

  const createNewDashboard = async () => {
    dashboardStore.initDashboard();
    return await dashboardStore
      .save(dashboardStore.dashboardInstance)
      .then(async (syncedDashboard) => {
        dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
        return syncedDashboard.dashboardId;
      });
  };

  const addCardToDashboard = async (dashboardId: string, metricId: string) => {
    return dashboardStore.addWidgetToDashboard(
      dashboardStore.getDashboard(parseInt(dashboardId, 10))!,
      [metricId]
    );
  };

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
      navigate(`${location.pathname}/${dashboardId}`, { replace: true });
    } else {
      navigate(`${location.pathname}/${cardId}`, { replace: true });
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
            Create <ArrowRight size={14} />
          </Space>
        </Button>
      </div>
      {props.extra}
      <WidgetFormNew />
      <WidgetPreview className="" name={metric.name} isEditing={true} />
    </div>
  );
}

export default CreateCard;

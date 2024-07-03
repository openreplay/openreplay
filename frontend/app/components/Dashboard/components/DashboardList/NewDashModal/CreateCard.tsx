import React from 'react';
import {Button, Space} from "antd";
import {ArrowLeft, ArrowRight} from "lucide-react";
import CardBuilder from "Components/Dashboard/components/WidgetForm/CardBuilder";
import {useHistory} from "react-router";
import {useStore} from "App/mstore";
import { HEATMAP } from "App/constants/card";
import {renderClickmapThumbnail} from "Components/Dashboard/components/WidgetForm/renderMap";
import WidgetPreview from "Components/Dashboard/components/WidgetPreview/WidgetPreview";

const getTitleByType = (type: string) => {
    switch (type) {
        case HEATMAP:
            return 'Heatmap';
        default:
            return 'Trend Single';
    }
}

interface Props {
    // cardType: string,
    onBack: () => void
}

function CreateCard(props: Props) {
    const history = useHistory();
    const {metricStore, dashboardStore, aiFiltersStore} = useStore();
    const metric = metricStore.instance;
    const siteId: string = history.location.pathname.split('/')[1];
    const dashboardId: string = history.location.pathname.split('/')[3];
    const isItDashboard = history.location.pathname.includes('dashboard')
    // const title = getTitleByType(metric.metricType)

    const createNewDashboard = async () => {
        dashboardStore.initDashboard();
        return await dashboardStore
            .save(dashboardStore.dashboardInstance)
            .then(async (syncedDashboard) => {
                dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
                return syncedDashboard.dashboardId;
            });
    }

    const addCardToDashboard = async (dashboardId: string, metricId: string) => {
        return dashboardStore.addWidgetToDashboard(
            dashboardStore.getDashboard(parseInt(dashboardId, 10))!, [metricId]
        );
    }

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
    }

    const createDashboardAndAddCard = async () => {
        const cardId = await createCard();

        if (dashboardId) {
            await addCardToDashboard(dashboardId, cardId);
            dashboardStore.fetch(dashboardId);
        } else if (isItDashboard) {
            const dashboardId = await createNewDashboard();
            await addCardToDashboard(dashboardId, cardId);
            history.replace(`${history.location.pathname}/${dashboardId}`);
        } else {
            history.replace(`${history.location.pathname}/${cardId}`);
        }
    }

    return (
        <div className="flex gap-4 flex-col">
            <div className="flex items-center justify-between">
                <Space>
                    <Button type="text" onClick={props.onBack}>
                        <ArrowLeft size={16}/>
                    </Button>
                    <div className="text-xl leading-4 font-medium">
                        {metric.name}
                    </div>
                </Space>
                <Button type="primary" onClick={createDashboardAndAddCard}>
                    <Space>
                        <ArrowRight size={14}/>Create
                    </Space>
                </Button>
            </div>
            <CardBuilder siteId={siteId}/>
            <WidgetPreview className="" name={metric.name} isEditing={true}/>
        </div>
    );
}

export default CreateCard;

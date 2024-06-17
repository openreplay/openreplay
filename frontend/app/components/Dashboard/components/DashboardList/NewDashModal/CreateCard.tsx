import React from 'react';
import {Button, Space} from "antd";
import {ArrowLeft, ArrowRight} from "lucide-react";
import CardBuilder from "Components/Dashboard/components/WidgetForm/CardBuilder";
import {useHistory} from "react-router";
import {useStore} from "App/mstore";
import {CLICKMAP} from "App/constants/card";
import {renderClickmapThumbnail} from "Components/Dashboard/components/WidgetForm/renderMap";
import WidgetPreview from "Components/Dashboard/components/WidgetPreview/WidgetPreview";

const getTitleByType = (type: string) => {
    switch (type) {
        case CLICKMAP:
            return 'Clickmap';
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
    const siteId = history.location.pathname.split('/')[1];
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
        const isClickmap = metric.metricType === CLICKMAP;
        if (isClickmap) {
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
        const dashboardId = await createNewDashboard();
        const cardId = await createCard();
        await addCardToDashboard(dashboardId, cardId);

        history.replace(`${history.location.pathname}/${dashboardId}`);
    }

    return (
        <div className="flex gap-4 flex-col">
            <div className="flex items-center justify-between">
                <Space>
                    <Button type="text" onClick={props.onBack}>
                        <ArrowLeft size={16}/>
                    </Button>
                    <div className="text-2xl leading-4 font-semibold">
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
            <WidgetPreview className="mt-8" name={metric.name} isEditing={true}/>
        </div>
    );
}

export default CreateCard;

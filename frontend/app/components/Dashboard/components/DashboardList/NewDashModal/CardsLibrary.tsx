import React, {useEffect, useMemo} from 'react';
import {useStore} from "App/mstore";
import WidgetWrapper from "Components/Dashboard/components/WidgetWrapper/WidgetWrapper";
import {observer} from "mobx-react-lite";
import {Loader} from "UI";
import WidgetChart from "Components/Dashboard/components/WidgetChart/WidgetChart";
import LazyLoad from 'react-lazyload';
import {Card} from "antd";
import {CARD_CATEGORIES} from "Components/Dashboard/components/DashboardList/NewDashModal/ExampleCards";

const CARD_TYPES_MAP = CARD_CATEGORIES.reduce((acc: any, category: any) => {
    acc[category.key] = category.types;
    return acc;
}, {});

interface Props {
    category?: string;
    selectedList: any;
    onCard: (metricId: number) => void;
}

function CardsLibrary(props: Props) {
    const {selectedList} = props;
    const {metricStore, dashboardStore} = useStore();

    const cards = useMemo(() => {
        return metricStore.filteredCards.filter((card: any) => {
            return CARD_TYPES_MAP[props.category || 'default'].includes(card.metricType);
        });
    }, [metricStore.filteredCards, props.category]);

    useEffect(() => {
        metricStore.fetchList();
    }, []);

    const onItemClick = (metricId: number) => {
        props.onCard(metricId);
    }

    return (
        <Loader loading={metricStore.isLoading}>
            <div className="grid grid-cols-4 gap-4 items-start">
                {cards.map((metric: any) => (
                    <React.Fragment key={metric.metricId}>
                        <div className={'col-span-' + metric.config.col}
                             onClick={() => onItemClick(metric.metricId)}>
                            <LazyLoad>
                                <Card hoverable
                                      style={{
                                          border: selectedList.includes(metric.metricId) ? '1px solid #1890ff' : '1px solid #f0f0f0',
                                      }}
                                      styles={{
                                          header: {padding: '4px 14px', minHeight: '36px', fontSize: '14px'},
                                          body: {padding: '14px'},
                                          cover: {
                                              border: '2px solid #1890ff',
                                              // border: selectedList.includes(metric.metricId) ? '2px solid #1890ff' : 'none',
                                          }
                                      }} title={metric.name}>
                                    <WidgetChart
                                        // isPreview={true}
                                        metric={metric}
                                        // isTemplate={true}
                                        // isWidget={false}
                                    />
                                </Card>
                            </LazyLoad>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </Loader>
    );
}

export default observer(CardsLibrary);

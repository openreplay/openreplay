import React from 'react';
import {List, Typography} from 'antd';
import {filtersMap} from 'Types/filter/newFilter';
import {Icon} from 'UI';
import {Progress, Empty} from 'antd';
import cn from "classnames";

interface Props {
    metric?: any;
    data: any;
    onClick?: (filters: any) => void;
    isTemplate?: boolean;
}

function SessionsBy(props: Props) {
    const {metric = {}, data = {values: []}, onClick = () => null, isTemplate} = props;
    const [selected, setSelected] = React.useState<any>(null);

    const onClickHandler = (event: any, data: any) => {
        const filters = Array<any>();
        let filter = {...filtersMap[metric.metricOf]};
        filter.value = [data.name];
        filter.type = filter.key;
        delete filter.key;
        delete filter.operatorOptions;
        delete filter.category;
        delete filter.icon;
        delete filter.label;
        delete filter.options;

        setSelected(data.name)

        filters.push(filter);
        onClick(filters);
    }

    return (
        <div style={{height: 240, overflowY: 'scroll', margin: '0 -16px', padding: '0 16px'}}>
            {data.values && data.values.length === 0 ? (
                <Empty
                    style={{minHeight: 220}}
                    className="flex flex-col items-center justify-center"
                    imageStyle={{height: 60}}
                    description={
                        <div className="flex items-center justify-center">
                            <Icon name="info-circle" className="mr-2" size="18"/>
                            No data for the selected time period
                        </div>
                    }
                />
            ) : (
                <List
                    dataSource={data.values}
                    split={false}
                    renderItem={(row: any) => (
                        <List.Item
                            key={row.name}
                            onClick={(e) => onClickHandler(e, row)}
                            // actions={[row.sessionCount]}
                            style={{borderBottom: '1px dotted rgba(0, 0, 0, 0.05)', padding: '6px 0'}}
                            className={cn('hover:bg-active-blue cursor-pointer', selected === row.name ? 'bg-gray-100' : '')}
                        >
                            <List.Item.Meta
                                avatar={row.icon ? row.icon : null}
                                title={(
                                    <div className="flex justify-between">
                                        <Typography.Text strong>{row.name}</Typography.Text>
                                        <Typography.Text type="secondary"> {row.sessionCount}</Typography.Text>
                                    </div>
                                )}
                                description={
                                    <Progress
                                        percent={row.progress}
                                        showInfo={false}
                                        strokeColor={{
                                            '0%': '#394EFF',
                                            '100%': '#394EFF',
                                        }}
                                        size={['small', 2]}
                                        style={{
                                            padding: '0 0px',
                                            margin: '0 0px',
                                        }}
                                    />
                                }
                            />
                            {/*<div className="min-w-8">{row.value}</div>*/}
                        </List.Item>
                    )}
                />
            )}
        </div>
    );
}

export default SessionsBy;

import React from 'react';
import {Button, Space} from 'antd';
import {filtersMap} from 'Types/filter/newFilter';
import {Icon} from 'UI';
import {Empty} from 'antd';
import {ArrowRight} from "lucide-react";
import CardSessionsByList from "Components/Dashboard/Widgets/CardSessionsByList";
import {useModal} from "Components/ModalContext";

interface Props {
    metric?: any;
    data: any;
    onClick?: (filters: any) => void;
    isTemplate?: boolean;
}

function SessionsBy(props: Props) {
    const {metric = {}, data = {values: []}, onClick = () => null, isTemplate} = props;
    const [selected, setSelected] = React.useState<any>(null);
    const total = data.values.length
    const {openModal, closeModal} = useModal();

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

    const showMore = () => {
        openModal(
            <CardSessionsByList list={data.values} onClickHandler={(e, item) => {
                closeModal();
                onClickHandler(null, item)
            }} selected={selected}/>, {
                title: metric.name,
                width: 600,
            })
    }

    return (
        <div>
            {data.values && data.values.length === 0 ? (
                <Empty
                    image={null}
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
                <div className="flex flex-col justify-between w-full" style={{height: 220}}>
                    <CardSessionsByList list={data.values.slice(0, 3)}
                                        selected={selected}
                                        onClickHandler={onClickHandler}/>
                    {total > 3 && (
                        <div className="flex">
                            <Button type="link" onClick={showMore}>
                                <Space className='flex font-medium gap-1'>
                                    {total - 5} More
                                    <ArrowRight size={16}/>
                                </Space>
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SessionsBy;

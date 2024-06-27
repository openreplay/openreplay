import React from 'react';
import FilterSelection from "Shared/Filters/FilterSelection/FilterSelection";
import {PlusIcon} from "lucide-react";
import {Button} from "antd";
import {useStore} from "App/mstore";

interface Props {
    series: any;
    excludeFilterKeys: Array<string>;
}

function AddStepButton({series, excludeFilterKeys}: Props) {
    const {metricStore} = useStore();
    const metric: any = metricStore.instance;

    const onAddFilter = (filter: any) => {
        series.filter.addFilter(filter);
        metric.updateKey('hasChanged', true)
    }
    return (
        <FilterSelection
            filter={undefined}
            onFilterClick={onAddFilter}
            excludeFilterKeys={excludeFilterKeys}
        >
            <Button type="link" className='border-none hover:bg-blue-50' icon={<PlusIcon size={16}/>} size="small">
                ADD STEP
            </Button>
        </FilterSelection>
    );
}

export default AddStepButton;

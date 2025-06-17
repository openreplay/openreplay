import React from 'react';
import FilterSelection from 'Shared/Filters/FilterSelection/FilterSelection';
import { PlusIcon } from 'lucide-react';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';
import { Filter } from '@/mstore/types/filterConstants';
import { observer } from 'mobx-react-lite';

interface Props {
  series: any;
}

function AddStepButton({ series }: Props) {
  const { t } = useTranslation();
  const { metricStore, filterStore } = useStore();
  const metric: any = metricStore.instance;
  const filters: Filter[] = filterStore.getCurrentProjectFilters();

  const onAddFilter = (filter: Filter) => {
    console.log('Add Step Button', filter);
    series.filter.addFilter(filter);
    metric.updateKey('hasChanged', true);
  };
  return (
    <FilterSelection
      filters={filters}
      onFilterClick={onAddFilter}
      // mode={'filters'} // excludeFilterKeys={excludeFilterKeys}
    >
      <Button
        type="text"
        className="border-none text-indigo-600 hover:text-indigo-600 align-bottom ms-2"
        icon={<PlusIcon size={16} />}
        size="small"
      >
        <span className="font-medium">{t('Add Step')}</span>
      </Button>
    </FilterSelection>
  );
}

export default observer(AddStepButton);

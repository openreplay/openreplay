import Filter from 'App/mstore/types/filter';
import { FilterKey } from 'App/types/filter/filterType';
import { observer } from 'mobx-react-lite';
import React from 'react';
import FilterItem from 'Shared/Filters/FilterItem';;

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/mstore';

interface Props {
  metric: any;
}
function ExcludeFilters(props: Props) {
  const { filterStore } = useStore();
  const { t } = useTranslation();
  const { metric } = props;

  const addPageFilter = () => {
    const f = filterStore.findEvent({
      name: FilterKey.LOCATION,
      autoCaptured: true,
    });
    if (!f) {
      console.error('Failed to find location filter');
      return;
    }
    metric.updateExcludes([f]);
  };

  const onUpdateFilter = (filterIndex: any, filterItem: any) => {
    metric.updateExcludeByIndex(filterIndex, filterItem);
  };

  const onRemoveFilter = (filterIndex: any) => {
    metric.removeExcludeByIndex(filterIndex);
  };

  return (
    <div className="mb-2 rounded-xl">
      {metric.excludes.length > 0 ? (
        <div className="bg-white rounded-xl border p-4">
          <div className="text-sm color-gray-medium mr-auto mb-2">
            {t('EXCLUDES')}
          </div>
          {metric.excludes.map((f: any, index: number) => (
            <FilterItem
              hideIndex
              filterIndex={index}
              // allowedFilterKeys={[
              //   FilterKey.LOCATION,
              //   FilterKey.CLICK,
              //   FilterKey.INPUT,
              //   FilterKey.CUSTOM,
              // ]}
              filter={f}
              onUpdate={(f) => onUpdateFilter(f.id, f)}
              onRemoveFilter={() => onRemoveFilter(index)}
              // saveRequestPayloads={saveRequestPayloads}
              disableDelete={false}
              // excludeFilterKeys={excludeFilterKeys}
              isLast={index === metric.excludes.length - 1}
            />
          ))}
        </div>
      ) : (
        <Button type="link" onClick={addPageFilter} className="!text-black">
          {t('Add Exclusion')}
        </Button>
      )}
    </div>
  );
}

export default observer(ExcludeFilters);

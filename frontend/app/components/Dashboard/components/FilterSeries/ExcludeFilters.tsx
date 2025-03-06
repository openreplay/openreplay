import Filter from 'App/mstore/types/filter';
import { FilterKey } from 'App/types/filter/filterType';
import { observer } from 'mobx-react-lite';
import React from 'react';
import FilterItem from 'Shared/Filters/FilterItem';
import cn from 'classnames';

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  filter: Filter;
}
function ExcludeFilters(props: Props) {
  const { t } = useTranslation();
  const { filter } = props;
  const hasExcludes = filter.excludes.length > 0;

  const addPageFilter = () => {
    const filterItem = filter.createFilterBykey(FilterKey.LOCATION);
    filter.addExcludeFilter(filterItem);
  };

  const onUpdateFilter = (filterIndex: any, filterItem: any) => {
    filter.updateExcludeFilter(filterIndex, filterItem);
  };

  const onRemoveFilter = (filterIndex: any) => {
    filter.removeExcludeFilter(filterIndex);
  };

  return (
    <div className={cn('flex items-center mb-2')}>
      {filter.excludes.length > 0 ? (
        <div className="flex items-center mb-2 bg-white rounded-xl flex-col px-4 py-2 w-full">
          <div className="text-sm color-gray-medium mr-auto mb-2">
            {t('EXCLUDES')}
          </div>
          {filter.excludes.map((f: any, index: number) => (
            <FilterItem
              hideIndex
              filterIndex={index}
              allowedFilterKeys={[
                FilterKey.LOCATION,
                FilterKey.CLICK,
                FilterKey.INPUT,
                FilterKey.CUSTOM,
              ]}
              filter={f}
              onUpdate={(f) => onUpdateFilter(index, f)}
              onRemoveFilter={() => onRemoveFilter(index)}
              // saveRequestPayloads={saveRequestPayloads}
              disableDelete={false}
              // excludeFilterKeys={excludeFilterKeys}
            />
          ))}
        </div>
      ) : (
        <Button type="link" onClick={addPageFilter}>
          {t('Add Exclusion')}
        </Button>
      )}
    </div>
  );
}

export default observer(ExcludeFilters);

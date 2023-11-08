import filters from 'App/duck/filters';
import Filter from 'App/mstore/types/filter';
import { FilterKey } from 'App/types/filter/filterType';
import { observer } from 'mobx-react-lite';
import React from 'react';
import FilterItem from 'Shared/Filters/FilterItem';
import cn from 'classnames';

import { Button } from 'UI';

interface Props {
  filter: Filter;
}
function ExcludeFilters(props: Props) {
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
    <div className={cn("flex items-center border-b", { 'p-5' : hasExcludes, 'px-2': !hasExcludes })}>
      {filter.excludes.length > 0 ? (
        <div className="flex items-center mb-2 flex-col">
          <div className="text-sm color-gray-medium mr-auto mb-2">EXCLUDES</div>
          {filter.excludes.map((f: any, index: number) => (
            <FilterItem
              hideIndex={true}
              filterIndex={index}
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
        <Button variant="text-primary" onClick={addPageFilter}>
          Add Exclusion
        </Button>
      )}
    </div>
  );
}

export default observer(ExcludeFilters);

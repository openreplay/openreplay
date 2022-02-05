import React from 'react';
import { Icon, Loader } from 'UI';
import { connect } from 'react-redux';
import cn from 'classnames';
import stl from './FilterModal.css';
import { filtersMap, getMetaDataFilter } from 'Types/filter/newFilter';
import { FilterKey, FilterType } from 'Types/filter/filterType';

interface Props {
  filters: any,
  onFilterClick?: (filter) => void,
  filterSearchList: any,
  metaOptions: any,
  isMainSearch?: boolean,
  fetchingFilterSearchList: boolean,
  searchQuery?: string,
}
function FilterModal(props: Props) {
  const { 
    filters,
    metaOptions,
    onFilterClick = () => null,
    filterSearchList,
    isMainSearch = false,
    fetchingFilterSearchList,
    searchQuery = '',
  } = props;
  const hasFilerSearchList = filterSearchList && Object.keys(filterSearchList).length > 0;
  const hasSearchQuery = searchQuery && searchQuery.length > 0;
  const showSearchList = isMainSearch && searchQuery.length > 0;
  
  const allFilters = Object.assign({}, filters);
  if (metaOptions.size > 0) {
    allFilters['Metadata'] = [];
    metaOptions.forEach((option) => {
      if (option.key) {
        const _metaFilter = getMetaDataFilter(option.key, option.value);
        allFilters['Metadata'].push(_metaFilter);
      }
    });
  }

  const onFilterSearchClick = (filter) => {
    const _filter = filtersMap[filter.type];
    _filter.value = [filter.value];
    onFilterClick(_filter);
  }
  
  return (
    <div className={stl.wrapper} style={{ width: '490px', maxHeight: '400px', overflowY: 'auto'}}>
      { showSearchList && (
        <Loader size="small" loading={fetchingFilterSearchList}>
          <div className="-mx-6 px-6">
            { filterSearchList && Object.keys(filterSearchList).map((key, index) => {
              const filter = filterSearchList[key];
              const option = filtersMap[key];
              return (
                <div
                  key={index}
                  className={cn('mb-3')}
                >
                  <div className="font-medium uppercase color-gray-medium text-sm mb-2">{option.label}</div>
                  <div>
                    {filter.map((f, i) => (
                      <div
                        key={i}
                        className={cn(stl.filterSearchItem, "cursor-pointer px-3 py-1 text-sm flex items-center")}
                        onClick={() => onFilterSearchClick({ type: key, value: f.value })}
                      >
                        <Icon className="mr-2" name={option.icon} size="16" />
                        <div className="whitespace-nowrap text-ellipsis overflow-hidden">{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Loader>
      )}
      
      { !hasSearchQuery && (
        <div className="" style={{ columns: "100px 2" }}>
          {allFilters && Object.keys(allFilters).map((key) => (
            <div className="mb-6" key={key}>
              <div className="uppercase font-medium mb-1 color-gray-medium tracking-widest text-sm">{key}</div>
              <div>
                {allFilters[key].map((filter: any) => (
                  <div key={filter.label} className={cn(stl.optionItem, "flex items-center py-2 cursor-pointer -mx-2 px-2")} onClick={() => onFilterClick(filter)}>
                    <Icon name={filter.icon} size="16"/>
                    <span className="ml-2">{filter.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default connect(state => ({
  filters: state.getIn([ 'filters', 'filterList' ]),
  filterSearchList: state.getIn([ 'search', 'filterSearchList' ]),
  metaOptions: state.getIn([ 'customFields', 'list' ]),
  fetchingFilterSearchList: state.getIn([ 'search', 'fetchFilterSearch', 'loading' ]),
}))(FilterModal);
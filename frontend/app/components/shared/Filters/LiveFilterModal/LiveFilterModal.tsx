import React from 'react';
import { Icon, Loader } from 'UI';
import { connect } from 'react-redux';
import cn from 'classnames';
import stl from './LiveFilterModal.module.css';
import { filtersMap } from 'Types/filter/newFilter';
import { getMatchingEntries } from 'Shared/Filters/FilterModal'

interface Props {
  filters: any,
  onFilterClick?: (filter) => void,
  filterSearchList: any,
  metaOptions: any,
  isMainSearch?: boolean,
  fetchingFilterSearchList: boolean,
  searchQuery?: string,
}
function LiveFilterModal(props: Props) {
  const {
    filters,
    metaOptions,
    onFilterClick = () => null,
    filterSearchList,
    isMainSearch = false,
    fetchingFilterSearchList,
    searchQuery = '',
  } = props;
  const hasSearchQuery = searchQuery && searchQuery.length > 0;
  const showSearchList = isMainSearch && searchQuery.length > 0;

  const onFilterSearchClick = (filter) => {
    const _filter = filtersMap[filter.type];
    _filter.value = [filter.value];
    onFilterClick(_filter);
  }

  const { matchingCategories, matchingFilters } = getMatchingEntries(searchQuery, filters);

  const isResultEmpty = (!filterSearchList || Object.keys(filterSearchList).filter(i => filtersMap[i].isLive).length === 0)
   && matchingCategories.length === 0 && matchingFilters.length === 0

  return (
    <div className={stl.wrapper} style={{ width: '490px', maxHeight: '400px', overflowY: 'auto'}}>
      <div className="">
          {matchingCategories.map((key) =>  {
            return (
              <div className="mb-6" key={key}>
                <div className="uppercase font-medium mb-1 color-gray-medium tracking-widest text-sm">{key}</div>
                <div>
                  {filters[key].map((filter: any) => {
                    if (hasSearchQuery) {
                      const matchingFilters = filters[key].filter(filter => filter.label.includes(searchQuery));
                      const hasMatchingSubstring = matchingFilters.length > 0 || key.includes(searchQuery);

                      if (hasSearchQuery && !hasMatchingSubstring) return null;
                    }
                    return (
                      <div key={filter.label} className={cn(stl.optionItem, "flex items-center py-2 cursor-pointer -mx-2 px-2")} onClick={() => onFilterClick(filter)}>
                        <Icon name={filter.icon} size="16"/>
                        <span className="ml-2">{filter.label}</span>
                      </div>
                    )}
                  )}
                </div>
              </div>
            )
          })}
        </div>
      { showSearchList && (
        <Loader size="small" loading={fetchingFilterSearchList}>
          <div className="-mx-6 px-6">
            { filterSearchList && Object.keys(filterSearchList).filter(i => filtersMap[i].isLive).map((key, index) => {
              const filter = filterSearchList[key];
              const option = filtersMap[key];
              return (
                <div
                  key={index}
                  className={cn('mb-3')}
                >
                  <div className="font-medium uppercase color-gray-medium mb-2">{option.label}</div>
                  <div>
                    {filter.map((f, i) => (
                      <div
                        key={i}
                        className={cn(stl.filterSearchItem, "cursor-pointer px-3 py-1 flex items-center")}
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
            {isResultEmpty && !fetchingFilterSearchList ? (
              <div className="flex items-center">
                <Icon className="color-gray-medium" name="binoculars" size="24" />
                <div className="color-gray-medium font-medium px-3"> No Suggestions Found </div>
              </div>
            ) : Object.keys(filterSearchList).filter(i => filtersMap[i].isLive).map((key, index) => {
              const filter = filterSearchList[key];
              const option = filtersMap[key];
              return (
                <div
                  key={index}
                  className={cn('mb-3')}
                >
                  <div className="font-medium uppercase color-gray-medium mb-2">{option.label}</div>
                  <div>
                    {filter.map((f, i) => (
                      <div
                        key={i}
                        className={cn(stl.filterSearchItem, "cursor-pointer px-3 py-1 flex items-center")}
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
    </div>
  );
}

export default connect(state => ({
  filters: state.getIn([ 'search', 'filterListLive' ]),
  filterSearchList: state.getIn([ 'search', 'filterSearchList' ]),
  metaOptions: state.getIn([ 'customFields', 'list' ]),
  fetchingFilterSearchList: state.getIn([ 'search', 'fetchFilterSearch', 'loading' ]),
}))(LiveFilterModal);

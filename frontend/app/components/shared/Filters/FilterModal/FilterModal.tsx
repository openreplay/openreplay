import React from 'react';
import { Icon, Loader } from 'UI';
import { connect } from 'react-redux';
import cn from 'classnames';
import stl from './FilterModal.module.css';
import { filtersMap } from 'Types/filter/newFilter';

export const getMatchingEntries = (searchQuery: string, filters: Record<string, any>) => {
  const matchingCategories: string[] = [];
  const matchingFilters: Record<string, any> = {};

  if (searchQuery.length === 0) return {
    matchingCategories: Object.keys(filters),
    matchingFilters: filters,
  };

  Object.keys(filters).forEach(name => {
    if (name.toLocaleLowerCase().includes(searchQuery)) {
      matchingCategories.push(name);
      matchingFilters[name] = filters[name];
    } else {
        const filtersQuery = filters[name]
        .filter(filterOption => filterOption.label.toLocaleLowerCase().includes(searchQuery))

        if (filtersQuery.length > 0) matchingFilters[name] = filtersQuery
        filtersQuery.length > 0 && matchingCategories.push(name);
      }
  })

  return { matchingCategories, matchingFilters };
}

interface Props {
  filters: any,
  onFilterClick?: (filter) => void,
  filterSearchList: any,
  // metaOptions: any,
  isMainSearch?: boolean,
  fetchingFilterSearchList: boolean,
  searchQuery?: string,
}
function FilterModal(props: Props) {
  const {
    filters,
    onFilterClick = () => null,
    filterSearchList,
    isMainSearch = false,
    fetchingFilterSearchList,
    searchQuery = '',
  } = props;
  const showSearchList = isMainSearch && searchQuery.length > 0;

  const onFilterSearchClick = (filter: any) => {
    const _filter = filtersMap[filter.type];
    _filter.value = [filter.value];
    onFilterClick(_filter);
  }

  const { matchingCategories, matchingFilters } = getMatchingEntries(searchQuery, filters);

  const isResultEmpty = (!filterSearchList || Object.keys(filterSearchList).length === 0)
    && matchingCategories.length === 0 && Object.keys(matchingFilters).length === 0

    // console.log(matchingFilters)
  return (
    <div className={stl.wrapper} style={{ width: '480px', maxHeight: '380px', overflowY: 'auto'}}>
      <div className={searchQuery && !isResultEmpty ? 'mb-6' : ''} style={{ columns: "auto 200px" }}>
          {matchingCategories.map((key) => {
            return (
              <div className="mb-6" key={key}>
                <div className="uppercase font-medium mb-1 color-gray-medium tracking-widest text-sm">{key}</div>
                <div>
                  {matchingFilters[key] && matchingFilters[key].map((filter: any) => (
                      <div key={filter.label} className={cn(stl.optionItem, "flex items-center py-2 cursor-pointer -mx-2 px-2")} onClick={() => onFilterClick({ ...filter, value: [''] })}>
                        <Icon name={filter.icon} size="16"/>
                        <span className="ml-2">{filter.label}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          )}
        </div>
      { showSearchList && (
        <Loader size="small" loading={fetchingFilterSearchList}>
          <div className="-mx-6 px-6">
            {isResultEmpty && !fetchingFilterSearchList ? (
              <div className="flex items-center">
                <Icon className="color-gray-medium" name="binoculars" size="24" />
                <div className="color-gray-medium font-medium px-3"> No Suggestions Found </div>
              </div>
            ) : Object.keys(filterSearchList).map((key, index) => {
              const filter = filterSearchList[key];
              const option = filtersMap[key];
              return option ? (
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
              ) : <></>;
            })}
          </div>
        </Loader>
      )}
    </div>
  );
}

export default connect((state: any, props: any) => {
  return ({
    filters: props.isLive ? state.getIn([ 'search', 'filterListLive' ]) : state.getIn([ 'search', 'filterList' ]),
    filterSearchList: props.isLive ? state.getIn([ 'liveSearch', 'filterSearchList' ]) : state.getIn([ 'search', 'filterSearchList' ]),
    // filterSearchList: state.getIn([ 'search', 'filterSearchList' ]),
    // liveFilterSearchList: state.getIn([ 'liveSearch', 'filterSearchList' ]),
    // metaOptions: state.getIn([ 'customFields', 'list' ]),
    fetchingFilterSearchList: props.isLive
            ? state.getIn(['liveSearch', 'fetchFilterSearch', 'loading'])
            : state.getIn(['search', 'fetchFilterSearch', 'loading']),
  })
})(FilterModal);

import React, { useEffect } from 'react';
import FilterList from 'Shared/Filters/FilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import SaveFilterButton from 'Shared/SaveFilterButton';
import { connect } from 'react-redux';
import { Button } from 'UI';
import { edit, addFilter, fetchSessions, updateFilter } from 'Duck/search';

import { debounce } from 'App/utils';
import useSessionSearchQueryHandler from 'App/hooks/useSessionSearchQueryHandler';

let debounceFetch: any = () => {}

interface Props {
  appliedFilter: any;
  edit: typeof edit;
  addFilter: typeof addFilter;
  saveRequestPayloads: boolean;
  metaLoading?: boolean
  fetchSessions: typeof fetchSessions;
  updateFilter: typeof updateFilter;
}
function SessionSearch(props: Props) {
  const { appliedFilter, saveRequestPayloads = false, metaLoading = false } = props;
  const hasEvents = appliedFilter.filters.filter((i: any) => i.isEvent).size > 0;
  const hasFilters = appliedFilter.filters.filter((i: any) => !i.isEvent).size > 0;

  useSessionSearchQueryHandler({ appliedFilter, applyFilter: props.updateFilter, loading: metaLoading });

  useEffect(() => {
    debounceFetch = debounce(() => props.fetchSessions(), 500);
  }, [])

  const onAddFilter = (filter: any) => {
    props.addFilter(filter);
  };

  const onUpdateFilter = (filterIndex: any, filter: any) => {
    const newFilters = appliedFilter.filters.map((_filter: any, i: any) => {
      if (i === filterIndex) {
        return filter;
      } else {
        return _filter;
      }
    });

    props.updateFilter({
      ...appliedFilter,
      filters: newFilters,
    });

    debounceFetch()
  };

  const onRemoveFilter = (filterIndex: any) => {
    const newFilters = appliedFilter.filters.filter((_filter: any, i: any) => {
      return i !== filterIndex;
    });

    props.updateFilter({
      filters: newFilters,
    });

    debounceFetch()
  };

  const onChangeEventsOrder = (e: any, { value }: any) => {
    props.updateFilter({
      eventsOrder: value,
    });

    debounceFetch()
  };

  return !metaLoading ? (
    <>
      {hasEvents || hasFilters ? (
        <div className="border bg-white rounded mt-4">
          <div className="p-5">
            <FilterList
              filter={appliedFilter}
              onUpdateFilter={onUpdateFilter}
              onRemoveFilter={onRemoveFilter}
              onChangeEventsOrder={onChangeEventsOrder}
              saveRequestPayloads={saveRequestPayloads}
            />
          </div>

          <div className="border-t px-5 py-1 flex items-center -mx-2">
            <div>
              <FilterSelection filter={undefined} onFilterClick={onAddFilter}>
                <Button
                  variant="text-primary"
                  className="mr-2"
                  icon="plus"
                >
                  ADD STEP
                </Button>
              </FilterSelection>
            </div>
            <div className="ml-auto flex items-center">
              <SaveFilterButton />
            </div>
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  ) : null;
}

export default connect(
  (state: any) => ({
    saveRequestPayloads: state.getIn(['site', 'instance', 'saveRequestPayloads']),
    appliedFilter: state.getIn(['search', 'instance']),
    metaLoading: state.getIn(['customFields', 'fetchRequestActive', 'loading'])
  }),
  { edit, addFilter, fetchSessions, updateFilter }
)(SessionSearch);

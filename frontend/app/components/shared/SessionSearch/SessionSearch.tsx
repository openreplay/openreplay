import React, { useEffect } from 'react';
import FilterList from 'Shared/Filters/FilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import SaveFilterButton from 'Shared/SaveFilterButton';
import { connect } from 'react-redux';
import { Button } from 'UI';
import { edit, addFilter } from 'Duck/search';
import { withRouter } from 'react-router';
import { clearSearch, fetchSessions, addFilterByKeyAndValue } from 'Duck/search';
import { FilterKey, getFilterKeyTypeByKey } from 'Types/filter/filterType';

const allowedQueryKeys = [
  'userOs',
  'userId',
  'userBrowser',
  'userDevice',
  'userCountry',
  'startDate',
  'endDate',
  'minDuration',
  'maxDuration',
  'referrer',
  'sort',
  'order',
];

interface Props {
  appliedFilter: any;
  edit: typeof edit;
  addFilter: typeof addFilter;
  saveRequestPayloads: boolean;
  location: any;
  addFilterByKeyAndValue: typeof addFilterByKeyAndValue;
}
function SessionSearch(props: Props) {
  const {
    appliedFilter,
    saveRequestPayloads = false,
    location: { search },
  } = props;
  const hasEvents = appliedFilter.filters.filter((i: any) => i.isEvent).size > 0;
  const hasFilters = appliedFilter.filters.filter((i: any) => !i.isEvent).size > 0;

  useEffect(() => {
    const queryParams = Object.fromEntries(
      Object.entries(Object.fromEntries(new URLSearchParams(search))).filter(([key]) =>
        allowedQueryKeys.includes(key)
      )
    );
    const entires = Object.entries(queryParams);
    if (entires.length > 0) {
      entires.forEach(([key, value]) => {
        if (value !== '') {
          const filterKey = getFilterKeyTypeByKey(key);
          const valueArr = value.split('|');
          const operator = valueArr.shift();
          console.log('operator', operator, valueArr);
          if (filterKey) {
            props.addFilterByKeyAndValue(filterKey, valueArr, operator);
          }
        }
      });
    }
  }, []);

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

    props.edit({
      ...appliedFilter,
      filters: newFilters,
    });
  };

  const onRemoveFilter = (filterIndex: any) => {
    const newFilters = appliedFilter.filters.filter((_filter: any, i: any) => {
      return i !== filterIndex;
    });

    props.edit({
      filters: newFilters,
    });
  };

  const onChangeEventsOrder = (e: any, { value }: any) => {
    props.edit({
      eventsOrder: value,
    });
  };

  return hasEvents || hasFilters ? (
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
            {/* <IconButton primaryText label="ADD STEP" icon="plus" /> */}
            <Button
              variant="text-primary"
              className="mr-2"
              // onClick={() => setshowModal(true)}
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
  );
}

export default withRouter(
  connect(
    (state: any) => ({
      saveRequestPayloads: state.getIn(['site', 'active', 'saveRequestPayloads']),
      appliedFilter: state.getIn(['search', 'instance']),
    }),
    { edit, addFilter, addFilterByKeyAndValue }
  )(SessionSearch)
);

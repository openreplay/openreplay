import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
import { Button } from 'UI';
// import { clearSearch } from 'Duck/search';
import { connect } from 'react-redux';
import { edit as editFilter, addFilterByKeyAndValue, clearSearch, fetchFilterSearch } from 'Duck/search';

interface Props {
    clearSearch: () => void;
    appliedFilter: any;
    optionsReady: boolean;
    editFilter: any,
    addFilterByKeyAndValue: any,
    fetchFilterSearch: any,
}
const MainSearchBar = (props: Props) => {
  const { appliedFilter  } = props;
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  return (
    <div className="flex items-center">
        <div style={{ width: "60%", marginRight: "10px"}}>
            <SessionSearchField
                editFilter={props.editFilter}
                addFilterByKeyAndValue={props.addFilterByKeyAndValue}
                clearSearch={props.clearSearch}
                fetchFilterSearch={props.fetchFilterSearch}
            />
        </div>
        <div className="flex items-center" style={{ width: "40%"}}>
        <SavedSearch />
        <Button
            variant="text-primary"
            className="ml-auto font-medium"
            disabled={!hasFilters}
            onClick={() => props.clearSearch()}
        >
            Clear Search
        </Button>
        </div>
    </div>
  )
}
export default connect(state => ({
    appliedFilter: state.getIn(['search', 'instance']),
    optionsReady: state.getIn(['customFields', 'optionsReady'])
}), {
    clearSearch,
    editFilter,
    addFilterByKeyAndValue,
    fetchFilterSearch
})(MainSearchBar);

import React from 'react';
import { Button } from 'UI';
import SessionSearchField from 'Shared/SessionSearchField';
import { connect } from 'react-redux';
import { edit as editFilter, addFilterByKeyAndValue, clearSearch, fetchFilterSearch } from 'Duck/liveSearch';

interface Props {
    appliedFilter: any;
    fetchFilterSearch: any;
    addFilterByKeyAndValue: any;
    clearSearch: any;
}
function AssistSearchField(props: Props) {
    const hasEvents = props.appliedFilter.filters.filter((i: any) => i.isEvent).size > 0;
    const hasFilters = props.appliedFilter.filters.filter((i: any) => !i.isEvent).size > 0;
    return (
        <div className="flex items-center w-full">
            <div style={{ width: '60%', marginRight: '10px' }}>
                <SessionSearchField />
            </div>
            <Button
                variant="text-primary"
                className="ml-auto font-medium"
                disabled={!hasFilters && !hasEvents}
                onClick={() => props.clearSearch()}
            >
                Clear Search
            </Button>
        </div>
    );
}

export default connect(
    (state: any) => ({
        appliedFilter: state.getIn(['liveSearch', 'instance']),
    }),
    {
        fetchFilterSearch,
        editFilter,
        addFilterByKeyAndValue,
        clearSearch,
    }
)(AssistSearchField);

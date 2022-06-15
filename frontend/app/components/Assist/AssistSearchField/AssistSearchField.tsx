import React from 'react';
import { Button } from 'UI';
import SessionSearchField from 'Shared/SessionSearchField';
// import { fetchFilterSearch } from 'Duck/search';
import { connect } from 'react-redux';
import { edit as editFilter, addFilterByKeyAndValue, clearSearch, fetchFilterSearch } from 'Duck/liveSearch';
// import { clearSearch } from 'Duck/search';

function AssistSearchField(props: any) {
    return (
        <div className="flex items-center">
            <div style={{ width: "60%", marginRight: "10px"}}>
                <SessionSearchField
                    fetchFilterSearch={props.fetchFilterSearch}
                    addFilterByKeyAndValue={props.addFilterByKeyAndValue}
                />
            </div>
            <Button
                variant="text-primary"
                className="ml-auto font-medium"
                // disabled={!hasFilters}
                onClick={() => props.clearSearch()}
            >
                Clear Search
            </Button>
        </div>
    );
}

export default connect(null, {
    fetchFilterSearch, editFilter, addFilterByKeyAndValue, clearSearch
})(AssistSearchField);
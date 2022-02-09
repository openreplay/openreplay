import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
import { Button, Popup } from 'UI';
import { clearSearch } from 'Duck/search';
import { connect } from 'react-redux';

interface Props {
    clearSearch: () => void;
    appliedFilter: any;
}
const LiveSearchBar = (props: Props) => {
  const { appliedFilter } = props;
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  return (
    <div className="flex items-center">
        <div style={{ width: "80%", marginRight: "10px"}}>
            <SessionSearchField />
        </div>
        <div className="flex items-center" style={{ width: "20%"}}>
            <Popup
                trigger={
                    <Button
                        plain
                        disabled={!hasFilters}
                        className="ml-auto"
                        onClick={() => props.clearSearch()}
                    >
                        <span className="font-medium">Clear</span>
                    </Button>
                }
                content={'Clear Steps'}
                size="tiny"
                inverted
                position="top right"
            />
        </div>
    </div>
  )
}
export default connect(state => ({
    appliedFilter: state.getIn(['search', 'instance']),
}), { clearSearch })(LiveSearchBar);
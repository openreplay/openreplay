import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
import { Button, Popup } from 'UI';
import { clearSearch } from 'Duck/search';
import { connect } from 'react-redux';
import stl from './mainSearchBar.css';
import cn from 'classnames';

interface Props {
    clearSearch: () => void;
    appliedFilter: any;
    optionsReady: boolean;
}
const MainSearchBar = (props: Props) => {
  const { appliedFilter, optionsReady } = props;
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  return (
    <div className="flex items-center">
        <div style={{ width: "60%", marginRight: "10px"}}><SessionSearchField /></div>
        <div className="flex items-center" style={{ width: "40%"}}>
        {optionsReady && <SavedSearch /> }
            <span
                className={cn("ml-auto", stl.button, { [stl.disabled]: !hasFilters })}
                onClick={() => props.clearSearch()}
            >
                <span className="font-medium">Clear search</span>
            </span>
        </div>
    </div>
  )
}
export default connect(state => ({
    appliedFilter: state.getIn(['search', 'instance']),
    optionsReady: state.getIn(['customFields', 'optionsReady'])
}), { clearSearch })(MainSearchBar);

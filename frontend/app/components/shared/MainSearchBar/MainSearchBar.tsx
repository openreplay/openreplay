import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
import { Button, Popup } from 'UI';
import { clearSearch } from 'Duck/search';
import { connect } from 'react-redux';

interface Props {
    clearSearch: () => void;
}
const MainSearchBar = (props: Props) => {
  return (
    <div className="flex items-center">
        <div style={{ width: "65%", marginRight: "10px"}}><SessionSearchField /></div>
        <div className="flex items-center" style={{ width: "35%"}}>
        <SavedSearch />
        <Popup
            trigger={
                <Button
                    plain
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
export default connect(null, { clearSearch })(MainSearchBar);
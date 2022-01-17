import React, { useState, useEffect } from 'react';
import { Button, Icon } from 'UI';
import SavedSearchDropdown from './components/SavedSearchDropdown';
import { connect } from 'react-redux';
import { fetchList as fetchListSavedSearch } from 'Duck/filters';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

interface Props {
  fetchListSavedSearch: () => void;
  list: any;
}
function SavedSearch(props) {
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    props.fetchListSavedSearch()
  }, [])

  return (
    <OutsideClickDetectingDiv 
      // className={ cn("relative", { "flex-1" : fullWidth }) } 
      onClickOutside={() => setShowMenu(false)}
    >
      <div className="relative">
        <Button prime outline size="small"
          className="flex items-center"
          onClick={() => setShowMenu(true)}
        >
          <span className="mr-2">Search Saved</span>
          <Icon name="ellipsis-v" color="teal" size="14" />
        </Button>
        { showMenu && (
          <div
            className="absolute right-0 bg-white border rounded z-50"
            style={{ top: '33px', width: '200px' }}
          >
            <SavedSearchDropdown list={props.list}/>
          </div>
        )}
      </div>
    </OutsideClickDetectingDiv>
  );
}

export default connect(state => ({
  list: state.getIn([ 'filters', 'list' ]),
}), { fetchListSavedSearch })(SavedSearch);
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
        <div className="flex items-center">
          <Button prime outline size="small"
            className="flex items-center"
            onClick={() => setShowMenu(true)}
          >
            <span className="mr-2">Search Saved</span>
            <Icon name="ellipsis-v" color="teal" size="14" />
          </Button>

          <div className="flex items-center ml-2">
            <Icon name="search" size="14" />
            <span className="color-gray-medium px-1">Viewing:</span>
            <span className="font-medium">Login ...</span>
          </div>
        </div>

        { showMenu && (
          <div
            className="absolute left-0 bg-white border rounded z-50"
            style={{ top: '33px', width: '200px' }}
          >
            <SavedSearchDropdown list={props.list} onClose={() => setShowMenu(false)} />
          </div>
        )}
      </div>
    </OutsideClickDetectingDiv>
  );
}

export default connect(state => ({
  list: state.getIn([ 'filters', 'list' ]),
}), { fetchListSavedSearch })(SavedSearch);
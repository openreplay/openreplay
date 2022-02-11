import React, { useState, useEffect } from 'react';
import { Button, Icon } from 'UI';
import SavedSearchDropdown from './components/SavedSearchDropdown';
import { connect } from 'react-redux';
import { fetchList as fetchListSavedSearch } from 'Duck/search';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cn from 'classnames';
import { list } from 'App/components/BugFinder/CustomFilters/filterModal.css';
import stl from './SavedSearch.css';

interface Props {
  fetchListSavedSearch: () => void;
  list: any;
  savedSearch: any;
}
function SavedSearch(props) {
  const { list } = props;
  const { savedSearch }  = props;
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
        <div className={cn("flex items-center", { [stl.disabled] : list.size === 0})}>
          <Button outline size="small"
            className="flex items-center"
            onClick={() => setShowMenu(true)}
          >
            <span className="mr-2">{`Saved Search (${list.size})`}</span>
            <Icon name="ellipsis-v" color="teal" size="14" />
          </Button>
          { savedSearch.exists() && (
            <div className="flex items-center ml-2">
              <Icon name="search" size="14" />
              <span className="color-gray-medium px-1">Viewing:</span>
              <span className="font-medium" style={{ whiteSpace: 'nowrap', width: '30%'}}>{savedSearch.name}</span>
            </div>
          )}
        </div>

        { showMenu && (
          <div
            className="absolute left-0 bg-white border rounded z-50"
            style={{ top: '33px', width: '200px' }}
          >
            <SavedSearchDropdown list={list} onClose={() => setShowMenu(false)} />
          </div>
        )}
      </div>
    </OutsideClickDetectingDiv>
  );
}

export default connect(state => ({
  list: state.getIn([ 'search', 'list' ]),
  savedSearch: state.getIn([ 'search', 'savedSearch' ])
}), { fetchListSavedSearch })(SavedSearch);
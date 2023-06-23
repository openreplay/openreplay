import React, { useEffect } from 'react';
import { Button, Icon } from 'UI';
import { connect } from 'react-redux';
import { fetchList as fetchListSavedSearch } from 'Duck/search';
import cn from 'classnames';
import stl from './SavedSearch.module.css';
import { useModal } from 'App/components/Modal';
import SavedSearchModal from './components/SavedSearchModal'

interface Props {
  fetchListSavedSearch: () => void;
  list: any;
  savedSearch: any;
}
function SavedSearch(props: Props) {
  const { list } = props;
  const { savedSearch }  = props;
  const { showModal } = useModal();

  useEffect(() => {
    if (list.size === 0) {
      props.fetchListSavedSearch()
    }
  }, [])

  return (
    <div className={cn("flex items-center", { [stl.disabled] : list.size === 0})}>
      <Button
        variant="outline"
        onClick={() => showModal(<SavedSearchModal />, { right: true, width: 450 })}
      >
        <span className="mr-1">Saved Search</span>
        <span className="font-bold mr-2">{list.size}</span>
        <Icon name="ellipsis-v" color="teal" size="14" />
      </Button>
      { savedSearch.exists() && (
        <div className="flex items-center ml-2">
          <Icon name="search" size="14" />
          <span className="color-gray-medium px-1">Viewing:</span>
          <span className="font-medium" style={{ whiteSpace: 'nowrap', width: '30%' }}>
            {savedSearch.name.length > 15 ? `${savedSearch.name.slice(0, 15)}...` : savedSearch.name}
          </span>
        </div>
      )}
    </div>
  );
}

export default connect((state: any) => ({
  list: state.getIn([ 'search', 'list' ]),
  savedSearch: state.getIn([ 'search', 'savedSearch' ])
}), { fetchListSavedSearch })(SavedSearch);

import React, { useState } from 'react';
import { Button } from 'UI';
import SaveSearchModal from 'Shared/SaveSearchModal';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';


function SaveFilterButton() {
  const { searchStore } = useStore();
  const savedSearch = searchStore.savedSearch;
  const [showModal, setshowModal] = useState(false);
  return (
    <div>
      <Button
        variant="text-primary"
        className="mr-2"
        onClick={() => setshowModal(true)}
        icon="zoom-in">
        {savedSearch.exists() ? 'UPDATE SEARCH' : 'SAVE SEARCH'}
      </Button>
      {showModal && (<SaveSearchModal show={showModal} closeHandler={() => setshowModal(false)} />)}
    </div>
  );
}

export default observer(SaveFilterButton);

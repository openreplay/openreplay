import React, { useState } from 'react';
import { Button } from 'antd';
import SaveSearchModal from 'Shared/SaveSearchModal';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

function SaveFilterButton({ disabled }: { disabled?: boolean }) {
  const { searchStore } = useStore();
  const { savedSearch } = searchStore;
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <Button
        type="link"
        disabled={disabled}
        onClick={() => setShowModal(true)}
      >
        {savedSearch.exists() ? 'Update Search' : 'Save Search'}
      </Button>
      {showModal && (
        <SaveSearchModal
          show={showModal}
          closeHandler={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default observer(SaveFilterButton);

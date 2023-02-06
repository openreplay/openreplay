import React, { useEffect, useState } from 'react';
import FetchBasicDetails from './components/FetchBasicDetails';
import { Button } from 'UI';
import FetchPluginMessage from './components/FetchPluginMessage';
import { TYPES } from 'Types/session/resource';
import FetchTabs from './components/FetchTabs/FetchTabs';
import { useStore } from 'App/mstore';

interface Props {
  resource: any;
  rows?: any;
  fetchPresented?: boolean;
}
function FetchDetailsModal(props: Props) {
  const { rows = [], fetchPresented = false } = props;
  const [resource, setResource] = useState(props.resource);
  const [first, setFirst] = useState(false);
  const [last, setLast] = useState(false);
  const isXHR = resource.type === TYPES.XHR || resource.type === TYPES.FETCH;
  const {
    sessionStore: { devTools },
  } = useStore();

  useEffect(() => {
    const index = rows.indexOf(resource);
    const length = rows.length - 1;
    setFirst(index === 0);
    setLast(index === length);
  }, [resource]);

  const prevClick = () => {
    const index = rows.indexOf(resource);
    if (index > 0) {
      setResource(rows[index - 1]);
      devTools.update('network', { index: index - 1 })
    }
  };

  const nextClick = () => {
    const index = rows.indexOf(resource);
    if (index < rows.length - 1) {
      setResource(rows[index + 1]);
      devTools.update('network', { index: index + 1 })
    }
  };

  return (
    <div className="bg-white p-5 h-screen overflow-y-auto" style={{ width: '500px' }}>
      <h5 className="mb-2 text-2xl">Network Request</h5>
      <FetchBasicDetails resource={resource} />

      {isXHR && !fetchPresented && <FetchPluginMessage />}
      {isXHR && <FetchTabs resource={resource} />}

      {rows && rows.length > 0 && (
        <div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
          <Button variant="outline" onClick={prevClick} disabled={first}>
            Prev
          </Button>
          <Button variant="outline" onClick={nextClick} disabled={last}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default FetchDetailsModal;

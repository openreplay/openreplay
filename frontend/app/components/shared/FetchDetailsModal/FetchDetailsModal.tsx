import React, { useEffect, useState } from 'react';
import FetchBasicDetails from './components/FetchBasicDetails';
import { Button } from 'UI';
import { ResourceType } from 'Player';
import FetchTabs from './components/FetchTabs/FetchTabs';
import { useStore } from 'App/mstore';
import { DateTime } from 'luxon';

interface Props {
  resource: any;
  time?: number;
  rows?: any;
  fetchPresented?: boolean;
}
function FetchDetailsModal(props: Props) {
  const { rows = [], fetchPresented = false } = props;
  const [resource, setResource] = useState(props.resource);
  const [first, setFirst] = useState(false);
  const [last, setLast] = useState(false);

  const isXHR = resource.type === ResourceType.XHR
      || resource.type === ResourceType.FETCH
      || resource.type === ResourceType.IOS

  const {
    sessionStore: { devTools },
    settingsStore: { sessionSettings: { timezone }},
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
      <FetchBasicDetails resource={resource} timestamp={props.time ? DateTime.fromMillis(props.time).setZone(timezone.value).toFormat(`hh:mm:ss a`) : undefined} />

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

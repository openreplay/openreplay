import React, { useEffect, useState } from 'react';
import FetchBasicDetails from './components/FetchBasicDetails';
import { Button } from 'antd';
import { ArrowRightOutlined,  ArrowLeftOutlined} from '@ant-design/icons';
import { ResourceType } from 'Player';
import FetchTabs from './components/FetchTabs/FetchTabs';
import { useStore } from 'App/mstore';
import { DateTime } from 'luxon';

interface Props {
  resource: any;
  time?: number;
  rows?: any;
  fetchPresented?: boolean;
  isSpot?: boolean;
}
function FetchDetailsModal(props: Props) {
  const { rows = [], fetchPresented = false, isSpot } = props;
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
      <h5 className="mb-4 text-2xl ">Network Request</h5>
      <FetchBasicDetails resource={resource} timestamp={props.time ? DateTime.fromMillis(props.time).setZone(timezone.value).toFormat(`hh:mm:ss a`) : undefined} />

      {isXHR && <FetchTabs isSpot={isSpot} resource={resource} />}

      {rows && rows.length > 0 && (
        <div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
          <Button type="text" onClick={prevClick} disabled={first} icon={<ArrowLeftOutlined />}>
            Prev
          </Button>
          <Button type="text" onClick={nextClick} disabled={last} icon={<ArrowRightOutlined />}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default FetchDetailsModal;

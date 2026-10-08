import React, { useState } from 'react';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import 'Components/Session/ReplayScreen/dev-tools.css';

import { RequestDetails } from './RequestDetails';
import { AnyResource } from './utils';

interface Props {
  resource: AnyResource;
  time?: number;
  rows?: any;
  fetchPresented?: boolean;
  isSpot?: boolean;
}

/** The request detail in the app's right drawer, where no player hosts the sheet. */
function FetchDetailsModal(props: Props) {
  const { rows = [] } = props;
  const { hideModal } = useModal();
  const {
    sessionStore: { devTools },
  } = useStore();
  const [index, setIndex] = useState(() =>
    Math.max(0, rows.indexOf(props.resource)),
  );
  const resource = rows.length ? rows[index] : props.resource;

  const go = (i: number) => {
    setIndex(i);
    devTools.update('network', { index: i });
  };

  return (
    <div className="m-rq m-rq--drawer">
      <RequestDetails
        resource={resource}
        index={index}
        total={rows.length}
        onPrev={() => go(index - 1)}
        onNext={() => go(index + 1)}
        onClose={hideModal}
        isSpot={props.isSpot}
      />
    </div>
  );
}

export default FetchDetailsModal;

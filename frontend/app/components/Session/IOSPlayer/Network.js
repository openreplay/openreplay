import { observer } from 'mobx-react-lite';
import { useState, useCallback } from 'react';
import { Popup, SlideModal } from 'UI';

import { NETWORK } from 'Player/ios/state';

import cls from './Network.module.css';

import TimeTable from 'Components/Session_/TimeTable';
import FetchDetails from 'Components/Session_/Fetch/FetchDetails';

const COLUMNS = [
  {
    label: 'Status',
    dataKey: 'status',
    width: 70,
  },
  {
    label: 'Method',
    dataKey: 'method',
    width: 60,
  },
  {
    label: 'url',
    width: 130,
    render: (r) => (
      <Popup
        content={<div className={cls.popupNameContent}>{r.url}</div>}
        size="mini"
        position="right center"
      >
        <div className={cls.popupNameTrigger}>{r.url}</div>
      </Popup>
    ),
  },
  {
    label: 'Size',
    width: 60,
    render: (r) => `${r.body.length}`,
  },
  {
    label: 'Time',
    width: 80,
    render: (r) => `${r.duration}ms`,
  },
];

function Network({ player }) {
  const [current, setCurrent] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const onRowClick = useCallback((raw, index) => {
    setCurrent(raw);
    setCurrentIndex(index);
  });
  const onNextClick = useCallback(() => {
    onRowClick(player.lists[NETWORK].list[currentIndex + 1], currentIndex + 1);
  });
  const onPrevClick = useCallback(() => {
    onRowClick(player.lists[NETWORK].list[currentIndex - 1], currentIndex - 1);
  });
  const closeModal = useCallback(() => setCurrent(null)); // TODO: handle in modal

  return (
    <>
      <SlideModal
        size="middle"
        title="Network Request"
        isDisplayed={current != null}
        content={
          current && (
            <FetchDetails
              resource={current}
              nextClick={onNextClick}
              prevClick={onPrevClick}
              first={currentIndex === 0}
              last={currentIndex === player.lists[NETWORK].countNow - 1}
            />
          )
        }
        onClose={closeModal}
      />
      <TimeTable
        rows={player.lists[NETWORK].listNow}
        hoverable
        tableHeight={270}
        onRowClick={onRowClick}
      >
        {COLUMNS}
      </TimeTable>
    </>
  );
}

export default observer(Network);

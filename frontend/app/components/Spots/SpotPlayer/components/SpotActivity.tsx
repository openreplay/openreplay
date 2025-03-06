import { CloseOutlined } from '@ant-design/icons';
import { TYPES } from 'Types/session/event';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import Event from 'Components/Session_/EventsBlock/Event';

import spotPlayerStore from '../spotPlayerStore';
import { useTranslation } from 'react-i18next';

function SpotActivity({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const mixedEvents = React.useMemo(() => {
    const result = [...spotPlayerStore.locations, ...spotPlayerStore.clicks];
    return result.sort((a, b) => a.time - b.time);
  }, [spotPlayerStore.locations, spotPlayerStore.clicks]);

  const { index } = spotPlayerStore.getHighlightedEvent(
    spotPlayerStore.time,
    mixedEvents,
  );
  const jump = (time: number) => {
    spotPlayerStore.setTime(time / 1000);
  };

  const getShadowColor = (ind: number) => {
    if (ind < index) return '#A7BFFF';
    if (ind === index) return '#394EFF';
    return 'transparent';
  };
  return (
    <div
      className="h-full bg-white border-l"
      style={{ minWidth: 320, width: 320 }}
    >
      <div className="flex items-center justify-between p-4">
        <div className="font-medium text-lg">{t('Activity')}</div>
        <Button type="text" size="small" onClick={onClose}>
          <CloseOutlined />
        </Button>
      </div>
      <div
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 128px)' }}
      >
        {mixedEvents.map((event, i) => (
          <div
            key={event.time}
            onClick={() => jump(event.time)}
            className="relative"
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 1.5,
                height: '100%',
                backgroundColor: getShadowColor(i),
                zIndex: 98,
              }}
            />
            {i === index ? (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: -10,
                  width: 10,
                  height: 10,
                  transform: 'rotate(45deg) translate(0, -50%)',
                  background: '#394EFF',
                  zIndex: 99,
                  borderRadius: '.15rem',
                }}
              />
            ) : null}
            {'label' in event ? (
              // @ts-ignore
              <ClickEv event={event} isCurrent={i === index} />
            ) : (
              <LocationEv event={event} isCurrent={i === index} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationEv({
  event,
  isCurrent,
}: {
  event: { time: number; location: string };
  isCurrent?: boolean;
}) {
  const locEvent = { ...event, type: TYPES.LOCATION, url: event.location };
  return <Event showLoadInfo whiteBg event={locEvent} isCurrent={isCurrent} />;
}

function ClickEv({
  event,
  isCurrent,
}: {
  event: { time: number; label: string };
  isCurrent?: boolean;
}) {
  const clickEvent = {
    type: TYPES.CLICK,
    label: event.label,
    count: 1,
  };
  return <Event whiteBg event={clickEvent} isCurrent={isCurrent} />;
}

export default observer(SpotActivity);

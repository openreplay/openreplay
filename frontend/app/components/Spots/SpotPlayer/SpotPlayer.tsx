import { observer } from 'mobx-react-lite';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useStore } from 'App/mstore';
import { Loader } from 'UI';

import SpotPlayerControls from './SpotPlayerControls';
import SpotPlayerHeader from './SpotPlayerHeader';
import SpotPlayerSideBar from './SpotSideBar';
import { Tab } from './consts';
import spotPlayerStore from './spotPlayerStore';

function SpotPlayer() {
  const { spotStore } = useStore();
  const { spotId } = useParams<{ spotId: string }>();
  const [activeTab, setActiveTab] = React.useState<Tab | null>(null);

  React.useEffect(() => {
    spotStore.fetchSpotById(spotId).then(async (spotInst) => {
      if (spotInst.mobURL) {
        try {
          const mobResp = await fetch(spotInst.mobURL);
          const {
            clicks = [],
            logs = [],
            network = [],
            locations = [],
            startTs = 0,
          } = await mobResp.json();
          spotPlayerStore.setStartTs(startTs);
          spotPlayerStore.setEvents(logs, locations, clicks, network);
        } catch (e) {
          console.error("Couldn't parse mob file", e);
        }
      }
    });
  }, []);
  if (!spotStore.currentSpot) {
    return <Loader />;
  }
  console.log(spotStore.currentSpot);

  const closeTab = () => {
    setActiveTab(null);
  };
  return (
    <div className={'w-screen h-screen  flex flex-col'}>
      <SpotPlayerHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title={spotStore.currentSpot.title}
        user={spotStore.currentSpot.user}
        date={spotStore.currentSpot.createdAt}
      />
      <div className={'w-full h-full flex'}>
        <div className={'w-full h-full flex flex-col justify-between'}>
          <div>url</div>
          <div className={'relative w-full h-full'}>
            <video
              className={'object-cover absolute top-0 left-0 w-full h-full'}
              src={spotStore.currentSpot?.videoURL}
            />
          </div>
          <SpotPlayerControls />
        </div>
        <SpotPlayerSideBar
          activeTab={activeTab}
          onClose={closeTab}
          comments={spotStore.currentSpot?.comments ?? []}
        />
      </div>
    </div>
  );
}

export default observer(SpotPlayer);

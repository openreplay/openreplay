import { observer } from 'mobx-react-lite';
import React from 'react';
import { useParams } from 'react-router-dom';
import CommentsSection from "./CommentsSection";
import { useStore } from 'App/mstore';

function SpotPlayer() {
  const { spotStore } = useStore();
  const { spotId } = useParams<{ spotId: string }>();

  React.useEffect(() => {
    void spotStore.fetchSpotById(spotId);
  }, []);
  if (!spotStore.currentSpot) {
    return <div>loading...</div>;
  }
  console.log(spotStore.currentSpot);
  return (
    <div className={'w-screen h-screen  flex flex-col'}>
      <div className={'p-2 w-full'}>header</div>
      <div className={'w-full h-full flex'}>
        <div className={'w-full h-full flex flex-col justify-between'}>
          <div>url</div>
          <div className={'relative w-full h-full'}>
            <video
              autoPlay
              className={'object-cover absolute top-0 left-0 w-full h-full'}
              src={spotStore.currentSpot?.videoURL}
            />
          </div>
          <div className={'w-full p-4'}>controls</div>
        </div>
        <CommentsSection comments={spotStore.currentSpot?.comments} />
      </div>
    </div>
  );
}

export default observer(SpotPlayer);

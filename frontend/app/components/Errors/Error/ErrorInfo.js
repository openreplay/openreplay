import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Loader, NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import MainSection from './MainSection';
import SideSection from './SideSection';

function ErrorInfo(props) {
  const { errorStore } = useStore();

  const ensureInstance = () => {
    if (errorStore.isLoading) return;
    errorStore.fetch(props.errorId);
    errorStore.fetchTrace(props.errorId);
  };

  useEffect(() => {
    ensureInstance();
  }, [props.errorId]);

  const errorIdInStore = errorStore.instance?.errorId;
  const loading = errorStore.isLoading;
  return (
    <NoContent
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.EMPTY_STATE} size="170" />
          <div className="mt-4">No Error Found!</div>
        </div>
      }
      subtext="Please try to find existing one."
      show={!loading && errorIdInStore == null}
    >
      <div className="flex w-full">
        <Loader loading={loading} className="w-full">
          <MainSection className="w-9/12" />
          <SideSection className="w-3/12" />
        </Loader>
      </div>
    </NoContent>
  );
}

export default observer(ErrorInfo);

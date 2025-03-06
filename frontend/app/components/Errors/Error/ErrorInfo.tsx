import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Loader, NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import MainSection from './MainSection';
import SideSection from './SideSection';
import { useTranslation } from 'react-i18next';

function ErrorInfo(props) {
  const { t } = useTranslation();
  const { errorStore } = useStore();
  const { instance } = errorStore;
  const ensureInstance = () => {
    if (errorStore.isLoading) return;
    errorStore.fetchError(props.errorId);
    errorStore.fetchErrorTrace(props.errorId);
  };

  React.useEffect(() => {
    ensureInstance();
  }, [props.errorId]);

  const errorIdInStore = errorStore.instance?.errorId;
  const loading = errorStore.isLoading;
  return (
    <NoContent
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.EMPTY_STATE} size="170" />
          <div className="mt-4">{t('>No Error Found!')}</div>
        </div>
      }
      subtext={t('Please try to find existing one.')}
      show={!loading && errorIdInStore == null}
    >
      <div className="flex w-full">
        <Loader loading={loading || !instance} className="w-full">
          <MainSection className="w-9/12" />
          <SideSection className="w-3/12" />
        </Loader>
      </div>
    </NoContent>
  );
}

export default observer(ErrorInfo);

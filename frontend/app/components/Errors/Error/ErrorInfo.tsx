import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { Loader, NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import MainSection from './MainSection';
import SideSection from './SideSection';

function ErrorInfo(props) {
  const { t } = useTranslation();
  const { errorStore } = useStore();
  const { instance } = errorStore;

  React.useEffect(() => {
    if (!props.errorId) return;
    void errorStore.fetchErrorDetails(props.errorId);
  }, [props.errorId]);

  const loading = errorStore.isLoadingError;
  return (
    <NoContent
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.EMPTY_STATE} size="170" />
          <div className="mt-4">{t('>No Error Found!')}</div>
        </div>
      }
      subtext={t('Please try to find existing one.')}
      show={!loading && instance == null}
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

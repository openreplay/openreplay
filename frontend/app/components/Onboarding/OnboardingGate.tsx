import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { OB_DEFAULT_TAB, onboarding, withSiteId } from 'App/routes';
import { Navigate, useParams } from 'App/routing';
import { Icon, Loader } from 'UI';

// the Router's loader unmounts this while the list is fetched, so the retry flag
// lives outside the component: one automatic retry per page load
let autoRetried = false;

// onboarding tabs read their project from the list, so render them only once it's there
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { projectsStore, userStore } = useStore();
  const { list, sitesLoading } = projectsStore;
  const { siteId, '*': tab } = useParams();

  const fetchProjects = () =>
    projectsStore.fetchList(undefined, userStore.account.tenantId);
  const listMissing = !sitesLoading && list.length === 0;

  React.useEffect(() => {
    if (!listMissing || autoRetried) return;
    autoRetried = true;
    void fetchProjects();
  }, [listMissing]);

  if (list.some((s) => s.id === siteId)) return <>{children}</>;

  const nearest = list.find((s) => s.id === projectsStore.siteId) ?? list[0];
  if (nearest) {
    return (
      <Navigate
        to={withSiteId(onboarding(tab || OB_DEFAULT_TAB), nearest.id)}
        replace
      />
    );
  }

  if (!listMissing || !autoRetried)
    return <Loader loading className="flex-1" />;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="flex items-center gap-2 font-medium">
        <Icon name="exclamation-circle" size={16} />
        {t('Could not load your projects.')}
      </div>
      <Button type="primary" onClick={() => void fetchProjects()}>
        {t('Retry')}
      </Button>
    </div>
  );
}

export default observer(OnboardingGate);

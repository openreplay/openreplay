import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Loader } from '@/ui/feedback/Loader';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { OB_DEFAULT_TAB, onboarding, withSiteId } from 'App/routes';
import { Navigate, useParams } from 'App/routing';

// the Router's loader unmounts this while the list is fetched, so the retry flag
// lives outside the component: one automatic retry per page load
let autoRetried = false;

// onboarding reads its project from the list, so render it only once it's there
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { projectsStore, userStore } = useStore();
  const { list, sitesLoading } = projectsStore;
  const { siteId, activeTab } = useParams();

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
        to={withSiteId(onboarding(activeTab || OB_DEFAULT_TAB), nearest.id)}
        replace
      />
    );
  }

  if (!listMissing || !autoRetried)
    return <Loader loading className="flex-1" />;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        title={t('Could not load your projects')}
        hint={t('Check your connection and try again.')}
        action={
          <Button onClick={() => void fetchProjects()}>{t('Try again')}</Button>
        }
      />
    </div>
  );
}

export default observer(OnboardingGate);

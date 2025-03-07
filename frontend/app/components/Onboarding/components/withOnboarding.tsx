import React, { useMemo } from 'react';
import { sessions, withSiteId, onboarding as onboardingRoute } from 'App/routes';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useParams, useNavigate } from "react-router";

export interface WithOnboardingProps {
  skip?: () => void;
  navTo?: (tab: string) => void;
  site?: any;
}

const withOnboarding = <P extends Record<string, any>>(
  Component: React.ComponentType<P>
) => {
  const WithOnboarding: React.FC<P & WithOnboardingProps> = (props) => {
    const { siteId } = useParams();
    const navigate = useNavigate();
    const { projectsStore, userStore } = useStore();
    const sites = projectsStore.list;
    const site = useMemo(() => sites.find((s: any) => s.id === siteId), [sites, siteId]);

    const skip = () => {
      userStore.setOnboarding(true);
      navigate(withSiteId(sessions(), siteId));
    };

    const navTo = (tab: string) => {
      navigate(withSiteId(onboardingRoute(tab), siteId));
    };

    return <Component skip={skip} navTo={navTo} {...props} site={site} />;
  };

  return observer(WithOnboarding)
};

export default withOnboarding;

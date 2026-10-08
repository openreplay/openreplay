import { Button } from '@/ui/actions/button';
import { Segmented } from '@/ui/inputs/toggle-group';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { FilterKey } from 'Types/filter/filterType';
import { TFunction } from 'i18next';
import {
  Activity,
  AppWindow,
  ArrowUpDown,
  CircleAlert,
  Combine,
  FileStack,
  Filter,
  FolderOpen,
  Globe,
  LineChart,
  MonitorSmartphone,
  Proportions,
  Turtle,
  Users,
  WifiOff,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import {
  CATEGORIES,
  FUNNEL,
  HEATMAP,
  TIMESERIES,
  USER_PATH,
  WEBVITALS,
} from 'App/constants/card';
import { useStore } from 'App/mstore';
import { metricCreate, withSiteId } from 'App/routes';
import { useNavigate } from 'App/routing';

import { Heatmap, UserJourney } from '../../cardIcons';
import '../../product-analytics.css';
import MetricsLibraryModal from '../MetricsLibraryModal/MetricsLibraryModal';

interface TabItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: string;
}

export const tabItems: (t: TFunction) => Record<string, TabItem[]> = (t) => ({
  [CATEGORIES.product_analytics]: [
    {
      icon: <LineChart width={16} />,
      title: t('Trends'),
      type: TIMESERIES,
      description: t('Track session and user trends over time.'),
    },
    {
      icon: <Filter width={16} />,
      title: t('Funnels'),
      type: FUNNEL,
      description: t('Visualize user progression through critical steps.'),
    },
    {
      icon: <UserJourney width={16} />,
      title: t('Journeys'),
      type: USER_PATH,
      description: t('Understand the paths users take through your product.'),
    },
    {
      icon: <Heatmap width={16} />,
      title: t('Heatmaps'),
      type: HEATMAP,
      description: t('Visualize user interaction patterns on your pages.'),
    },
  ],
  [CATEGORIES.monitors]: [
    {
      icon: <CircleAlert width={16} />,
      title: t('JS Errors'),
      type: FilterKey.ERRORS,
      description: t('Monitor JS errors affecting user experience.'),
    },
    {
      icon: <ArrowUpDown width={16} />,
      title: t('Top Network Requests'),
      type: FilterKey.FETCH,
      description: t('Identify the most frequent network requests.'),
    },
    {
      icon: <WifiOff width={16} />,
      title: t('4xx/5xx Requests'),
      type: `${TIMESERIES}_4xx_requests`,
      description: t('Track client and server errors for performance issues.'),
    },
    {
      icon: <Turtle width={16} />,
      title: t('Slow Network Requests'),
      type: `${TIMESERIES}_slow_network_requests`,
      description: t('Pinpoint the slowest network requests causing delays.'),
    },
    {
      icon: <Activity width={16} />,
      title: t('Web Vitals'),
      type: WEBVITALS,
      description: t('Monitor key web performance metrics.'),
    },
  ],
  [CATEGORIES.web_analytics]: [
    {
      icon: <FileStack width={16} />,
      title: t('Top Pages'),
      type: FilterKey.LOCATION,
      description: t('Discover the most visited pages on your site.'),
    },
    {
      icon: <AppWindow width={16} />,
      title: t('Top Browsers'),
      type: FilterKey.USER_BROWSER,
      description: t('Analyze the browsers your visitors are using the most.'),
    },
    {
      icon: <Proportions width={16} />,
      title: t('Top Resolutions'),
      type: FilterKey.RESOLUTIONS,
      description: t(
        'Analyze what resolutions are most used amongs your users.',
      ),
    },
    {
      icon: <Combine width={16} />,
      title: t('Top Referrer'),
      type: FilterKey.REFERRER,
      description: t('See where your traffic is coming from.'),
    },
    {
      icon: <Users width={16} />,
      title: t('Top Users'),
      type: FilterKey.USERID,
      description: t('Identify the users with the most interactions.'),
    },
    {
      icon: <Globe width={16} />,
      title: t('Top Countries'),
      type: FilterKey.USER_COUNTRY,
      description: t('Track the geographical distribution of your audience.'),
    },
    {
      icon: <MonitorSmartphone width={16} />,
      title: t('Top Devices'),
      type: FilterKey.USER_DEVICE,
      description: t('Explore the devices used by your users.'),
    },
  ],
});

export const mobileTabItems: (t: TFunction) => Record<string, TabItem[]> = (
  t,
) => ({
  // [CATEGORIES.product_analytics]: [
  //   {
  //     icon: <LineChart width={16} />,
  //     title: 'Trends',
  //     type: TIMESERIES,
  //     description: 'Track session and user trends over time.'
  //   },
  //   {
  //     icon: <Filter width={16} />,
  //     title: 'Funnels',
  //     type: FUNNEL,
  //     description: 'Visualize user progression through critical steps.'
  //   }
  // ],
  [CATEGORIES.web_analytics]: [
    {
      icon: <Users width={16} />,
      title: t('Top Users'),
      type: FilterKey.USERID,
      description: t('Identify the users with the most interactions.'),
    },
    {
      icon: <Globe width={16} />,
      title: t('Top Countries'),
      type: FilterKey.USER_COUNTRY,
      description: t('Track the geographical distribution of your audience.'),
    },
    {
      icon: <MonitorSmartphone width={16} />,
      title: t('Top Devices'),
      type: FilterKey.USER_DEVICE,
      description: t('Explore the devices used by your users.'),
    },
  ],
});

const AddCardSection = observer(
  ({
    inCards,
    hideExisting,
    handleOpenChange,
  }: {
    inCards?: boolean;
    hideExisting?: boolean;
    handleOpenChange?: (isOpen: boolean) => void;
  }) => {
    const { t } = useTranslation();
    const { showModal } = useModal();
    const { metricStore, dashboardStore, projectsStore } = useStore();
    const navigate = useNavigate();
    const { isMobile } = projectsStore;
    const [tab, setTab] = React.useState(
      isMobile ? 'web_analytics' : 'product_analytics',
    );
    const [query, setQuery] = React.useState('');

    const labels: Record<string, string> = isMobile
      ? { web_analytics: t('Mobile Analytics') }
      : {
          product_analytics: t('Product Analytics'),
          monitors: t('Monitors'),
          web_analytics: t('Web Analytics'),
        };
    const groups = isMobile ? mobileTabItems(t) : tabItems(t);
    const q = query.trim().toLowerCase();
    const shown = q
      ? Object.entries(groups).flatMap(([cat, items]) =>
          items
            .filter(
              (i) =>
                i.title.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q),
            )
            .map((i) => ({ ...i, hint: labels[cat] })),
        )
      : (groups[tab] ?? []).map((i) => ({ ...i, hint: i.description }));

    const pick = (card: string) => {
      if (!projectsStore.activeSiteId) return;
      handleOpenChange?.(false);
      const dbId = dashboardStore.selectedDashboard?.dashboardId;
      const search =
        dbId && !inCards ? `?mk=${card}&dashboardId=${dbId}` : `?mk=${card}`;
      navigate(
        {
          pathname: withSiteId(metricCreate(), projectsStore.activeSiteId),
          search,
        },
        { relative: 'route' },
      );
    };

    const onExistingClick = () => {
      const dashboardId = dashboardStore.selectedDashboard?.dashboardId;
      const siteId = projectsStore.activeSiteId;
      showModal(
        <MetricsLibraryModal siteId={siteId} dashboardId={dashboardId} />,
        {
          right: true,
          width: 800,
          onClose: () => {
            metricStore.updateKey('metricsSearch', '');
          },
        },
      );
      handleOpenChange?.(false);
    };

    return (
      <div className="m-addcard" data-slot="add-card">
        <p className="m-addcard__title">
          {t('What do you want to visualize?')}
        </p>
        <PopoverSearch
          placeholder={t('Search kinds')}
          value={query}
          onChange={setQuery}
        />
        {!q && Object.keys(labels).length > 1 ? (
          <Segmented
            block
            value={tab}
            onChange={setTab}
            ariaLabel={t('Card category')}
            options={Object.entries(labels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        ) : null}
        {q && shown.length === 0 ? (
          <p className="m-addcard__none">{t('No kind matches that.')}</p>
        ) : null}
        <ul className="m-addcard__list">
          {shown.map((item) => (
            <li key={item.type}>
              <button
                type="button"
                className="m-addcard__row"
                onClick={() => pick(item.type)}
              >
                <span className="m-addcard__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="m-addcard__text">
                  <span className="m-addcard__name">{item.title}</span>
                  <span className="m-addcard__desc">{item.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {inCards || hideExisting ? null : (
          <div className="m-addcard__foot">
            <Button
              variant="subtle"
              className="w-full"
              onClick={onExistingClick}
            >
              <FolderOpen size={14} />
              {t('Add existing card')}
            </Button>
          </div>
        )}
      </div>
    );
  },
);

export default AddCardSection;

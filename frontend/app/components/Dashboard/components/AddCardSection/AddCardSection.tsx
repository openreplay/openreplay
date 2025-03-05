import React from 'react';
import { FolderOutlined } from '@ant-design/icons';
import { Segmented, Button } from 'antd';
import {
  LineChart,
  Filter,
  ArrowUpDown,
  WifiOff,
  Turtle,
  FileStack,
  AppWindow,
  Combine,
  Users,
  Sparkles,
  Globe,
  MonitorSmartphone,
} from 'lucide-react';
import { Icon } from 'UI';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import {
  HEATMAP,
  FUNNEL,
  TIMESERIES,
  USER_PATH,
  CATEGORIES,
} from 'App/constants/card';
import { useHistory } from 'react-router-dom';
import { dashboardMetricCreate, withSiteId, metricCreate } from 'App/routes';
import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';
import MetricsLibraryModal from '../MetricsLibraryModal/MetricsLibraryModal';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

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
      icon: <Icon name="dashboards/user-journey" color="inherit" size={16} />,
      title: t('Journeys'),
      type: USER_PATH,
      description: t('Understand the paths users take through your product.'),
    },
    {
      icon: <Icon name="dashboards/heatmap-2" color="inherit" size={16} />,
      title: t('Heatmaps'),
      type: HEATMAP,
      description: t('Visualize user interaction patterns on your pages.'),
    },
  ],
  [CATEGORIES.monitors]: [
    {
      icon: <Icon name="dashboards/circle-alert" color="inherit" size={16} />,
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

function CategoryTab({
  tab,
  inCards,
  isMobile,
}: {
  tab: string;
  isMobile?: boolean;
  inCards?: boolean;
}) {
  const { t } = useTranslation();
  const items = isMobile ? mobileTabItems(t)[tab] : tabItems(t)[tab];
  const { projectsStore, dashboardStore } = useStore();
  const history = useHistory();

  const handleCardSelection = (card: string) => {
    if (projectsStore.activeSiteId) {
      if (inCards) {
        history.push(
          `${withSiteId(metricCreate(), projectsStore.activeSiteId)}?mk=${card}`,
        );
      } else if (dashboardStore.selectedDashboard) {
        history.push(
          `${withSiteId(
            dashboardMetricCreate(dashboardStore.selectedDashboard.dashboardId),
            projectsStore.activeSiteId,
          )}?mk=${card}`,
        );
      }
    }
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div
          onClick={() => handleCardSelection(item.type)}
          key={index}
          className="flex items-start gap-2 p-2 hover:bg-active-blue rounded-xl hover:text-teal group cursor-pointer"
        >
          {item.icon}
          <div className="leading-none">
            <div>{item.title}</div>
            <div className="text-disabled-text group-hover:text-teal/60 text-sm">
              {item.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const AddCardSection = observer(
  ({
    inCards,
    handleOpenChange,
  }: {
    inCards?: boolean;
    handleOpenChange?: (isOpen: boolean) => void;
  }) => {
    const { t } = useTranslation();
    const { showModal } = useModal();
    const { metricStore, dashboardStore, projectsStore } = useStore();
    const { isMobile } = projectsStore;
    const [tab, setTab] = React.useState(
      isMobile ? 'web_analytics' : 'product_analytics',
    );

    const options = isMobile
      ? [
          // { label: 'Product Analytics', value: 'product_analytics' },
          { label: t('Mobile Analytics'), value: 'web_analytics' },
        ]
      : [
          { label: t('Product Analytics'), value: 'product_analytics' },
          { label: t('Monitors'), value: 'monitors' },
          { label: t('Web Analytics'), value: 'web_analytics' },
        ];

    const originStr = window.env.ORIGIN || window.location.origin;
    const isSaas = /api\.openreplay\.com/.test(originStr);
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
      <div className="pt-4 pb-6 px-6 rounded-xl bg-white border border-gray-lighter flex flex-col gap-2 shadow-sm">
        <div className="flex justify-between p-2">
          <div className="text-xl font-medium mb-1">
            {t('What do you want to visualize?')}
          </div>
          {isSaas ? (
            <div className="font-medium flex items-center gap-2 cursor-pointer">
              <Sparkles color="#3C00FFD8" size={16} />
              <div className="ai-gradient">{t('Ask AI')}</div>
            </div>
          ) : null}
        </div>
        <div>
          {options.length > 1 ? (
            <Segmented
              options={options}
              value={tab}
              onChange={(value) => setTab(value)}
            />
          ) : null}
        </div>

        <div className="py-2">
          <CategoryTab isMobile={isMobile} tab={tab} inCards={inCards} />
        </div>
        {inCards ? null : (
          <div className="w-full flex items-center justify-center border-t mt-auto border-t-gray-lighter gap-2 pt-2 cursor-pointer">
            <Button
              className="w-full mt-4 hover:bg-active-blue hover:text-teal"
              type="text"
              variant="text"
              onClick={onExistingClick}
            >
              <FolderOutlined />
              &nbsp;{t('Add existing card')}
            </Button>
          </div>
        )}
      </div>
    );
  },
);

export default AddCardSection;

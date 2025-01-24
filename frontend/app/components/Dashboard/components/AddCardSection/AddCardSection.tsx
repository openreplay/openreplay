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
import FilterSeries from 'App/mstore/types/filterSeries';
import { useModal } from 'App/components/Modal';
import {
  CARD_LIST,
  CardType,
} from '../DashboardList/NewDashModal/ExampleCards';
import { useStore } from 'App/mstore';
import {
  HEATMAP,
  FUNNEL,
  TABLE,
  TIMESERIES,
  USER_PATH,
  CATEGORIES,
} from 'App/constants/card';
import { useHistory } from 'react-router-dom';
import { dashboardMetricCreate, withSiteId, metricCreate } from 'App/routes';
import { FilterKey } from 'Types/filter/filterType';
import MetricsLibraryModal from '../MetricsLibraryModal/MetricsLibraryModal';
import { observer } from 'mobx-react-lite';

interface TabItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: string;
}
export const tabItems: Record<string, TabItem[]> = {
  [CATEGORIES.product_analytics]: [
    {
      icon: <LineChart width={16} />,
      title: 'Trends',
      type: TIMESERIES,
      description: 'Track session trends over time.',
    },
    {
      icon: <Filter width={16} />,
      title: 'Funnels',
      type: FUNNEL,
      description: 'Visualize user progression through critical steps.',
    },
    {
      icon: (
        <Icon name={'dashboards/user-journey'} color={'inherit'} size={16} />
      ),
      title: 'Journeys',
      type: USER_PATH,
      description: 'Understand the paths users take through your product.',
    },
    // { TODO: 1.23+
    //   icon: <Icon name={'dashboards/cohort-chart'} color={'inherit'} size={16} />,
    //   title: 'Retention',
    //   type: RETENTION,
    //   description: 'Analyze user retention over specific time periods.',
    // },
    {
      icon: <Icon name={'dashboards/heatmap-2'} color={'inherit'} size={16} />,
      title: 'Heatmaps',
      type: HEATMAP,
      description: 'Visualize user interaction patterns on your pages.',
    },
  ],
  [CATEGORIES.monitors]: [
    {
      icon: (
        <Icon name={'dashboards/circle-alert'} color={'inherit'} size={16} />
      ),
      title: 'JS Errors',
      type: FilterKey.ERRORS,
      description: 'Monitor JS errors affecting user experience.',
    },
    {
      icon: <ArrowUpDown width={16} />,
      title: 'Top Network Requests',
      type: FilterKey.FETCH,
      description: 'Identify the most frequent network requests.',
    },
    {
      icon: <WifiOff width={16} />,
      title: '4xx/5xx Requests',
      type: TIMESERIES + '_4xx_requests',
      description: 'Track client and server errors for performance issues.',
    },
    {
      icon: <Turtle width={16} />,
      title: 'Slow Network Requests',
      type: TIMESERIES + '_slow_network_requests',
      description: 'Pinpoint the slowest network requests causing delays.',
    },
  ],
  [CATEGORIES.web_analytics]: [
    {
      icon: <FileStack width={16} />,
      title: 'Top Pages',
      type: FilterKey.LOCATION,
      description: 'Discover the most visited pages on your site.',
    },
    {
      icon: <AppWindow width={16} />,
      title: 'Top Browsers',
      type: FilterKey.USER_BROWSER,
      description: 'Analyze the browsers your visitors are using the most.',
    },
    {
      icon: <Combine width={16} />,
      title: 'Top Referrer',
      type: FilterKey.REFERRER,
      description: 'See where your traffic is coming from.',
    },
    {
      icon: <Users width={16} />,
      title: 'Top Users',
      type: FilterKey.USERID,
      description: 'Identify the users with the most interactions.',
    },
    {
      icon: <Globe width={16} />,
      title: 'Top Countries',
      type: FilterKey.USER_COUNTRY,
      description: 'Track the geographical distribution of your audience.',
    },
    {
      icon: <MonitorSmartphone width={16} />,
      title: 'Top Devices',
      type: FilterKey.USER_DEVICE,
      description: 'Explore the devices used by your users.',
    }
    // { TODO: 1.23+ maybe
    //   icon: <ArrowDown10 width={16} />,
    //   title: 'Speed Index by Country',
    //   type: TABLE,
    //   description: 'Measure performance across different regions.',
    // },
  ],
};

function CategoryTab({ tab, inCards }: { tab: string; inCards?: boolean }) {
  const items = tabItems[tab];
  const { metricStore, projectsStore, dashboardStore } = useStore();
  const history = useHistory();

  const handleCardSelection = (card: string) => {
    metricStore.init();
    const selectedCard = CARD_LIST.find((c) => c.key === card) as CardType;
    const cardData: any = {
      metricType: selectedCard.cardType,
      name: selectedCard.title,
      metricOf: selectedCard.metricOf,
      category: card,
    };

    if (selectedCard.filters) {
      cardData.series = [
        new FilterSeries().fromJson({
          name: 'Series 1',
          filter: {
            filters: selectedCard.filters,
          },
        }),
      ];
    }

    // TODO This code here makes 0 sense
    if (selectedCard.cardType === FUNNEL) {
      cardData.series = [];
      cardData.series.push(new FilterSeries());
      cardData.series[0].filter.addFunnelDefaultFilters();
      cardData.series[0].filter.eventsOrder = 'then';
      cardData.series[0].filter.eventsOrderSupport = ['then'];
    }

    metricStore.setCardCategory(tab);
    metricStore.merge(cardData);

    if (projectsStore.activeSiteId) {
      if (inCards) {
        history.push(withSiteId(metricCreate(), projectsStore.activeSiteId));
      } else if (dashboardStore.selectedDashboard) {
        history.push(
          withSiteId(
            dashboardMetricCreate(dashboardStore.selectedDashboard.dashboardId),
            projectsStore.activeSiteId
          )
        );
      }
    }
  };
  return (
    <div className={'flex flex-col gap-3'}>
      {items.map((item, index) => (
        <div
          onClick={() => handleCardSelection(item.type)}
          key={index}
          className={
            'flex items-start gap-2 p-2 hover:bg-active-blue rounded-xl hover:text-teal group cursor-pointer'
          }
        >
          {item.icon}
          <div className={'leading-none'}>
            <div>{item.title}</div>
            <div className={'text-disabled-text group-hover:text-teal/60 text-sm'}>
              {item.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const AddCardSection = observer(
  ({ inCards, handleOpenChange }: { inCards?: boolean, handleOpenChange?: (isOpen: boolean) => void }) => {
    const { showModal } = useModal();
    const { metricStore, dashboardStore, projectsStore } = useStore();
    const [tab, setTab] = React.useState('product_analytics');
    const options = [
      { label: 'Product Analytics', value: 'product_analytics' },
      { label: 'Monitors', value: 'monitors' },
      { label: 'Web Analytics', value: 'web_analytics' },
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
        }
      );
      handleOpenChange?.(false);
    };
    return (
      <div
        className={
          'pt-4 pb-6 px-6 rounded-xl bg-white border border-gray-lighter flex flex-col gap-2'
        }
      >
        <div className={'flex justify-between p-2'}>
          <div className={'text-xl font-medium mb-1'}>
            What do you want to visualize?
          </div>
          {isSaas ? (
            <div
              className={'font-medium flex items-center gap-2 cursor-pointer'}
            >
              <Sparkles color={'#3C00FFD8'} size={16} />
              <div className={'ai-gradient'}>Ask AI</div>
            </div>
          ) : null}
        </div>
        <div>
          <Segmented
            options={options}
            value={tab}
            onChange={(value) => setTab(value)}
          />
        </div>

        <div className="py-2">
          <CategoryTab tab={tab} inCards={inCards} />
        </div>
        {inCards ? null :
          <div
            className={
              'w-full flex items-center justify-center border-t mt-auto border-t-gray-lighter gap-2 pt-2 cursor-pointer'
            }
          >
            <Button
              className="w-full mt-4 hover:bg-active-blue hover:text-teal"
              type="text"
              variant="text"
              onClick={onExistingClick}
            >
              <FolderOutlined /> Add existing card
            </Button>
          </div>
        }
      </div>
    );
  }
);

export default AddCardSection;

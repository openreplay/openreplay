import React from 'react';
import { FolderOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import {
  LineChart,
  AlignStartVertical,
  ArrowUpDown,
  WifiOff,
  Turtle,
  FileStack,
  AppWindow,
  Earth,
  Combine,
  Users,
  ArrowDown10,
} from 'lucide-react';
import { Icon } from 'UI';

interface TabItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}
const tabItems: Record<string, TabItem[]> = {
  product_analytics: [
    {
      icon: <LineChart width={16} />,
      title: 'Trends',
      description: 'Track session trends over time.',
    },
    {
      icon: <AlignStartVertical width={16} />,
      title: 'Funnel',
      description: 'Visualize user progression through critical steps.',
    },
    {
      icon: <Icon name={'dashboards/user-journey'} size={16} />,
      title: 'Journeys',
      description: 'Understand the paths users take through your product.',
    },
    {
      icon: <Icon name={'dashboards/cohort-chart'} size={16} />,
      title: 'Retention',
      description: 'Analyze user retention over specific time periods.',
    },
    {
      icon: <Icon name={'dashboards/heatmap-2'} size={16} />,
      title: 'Heatmaps',
      description: 'Generate a report using by asking AI.',
    },
  ],
  monitors: [
    {
      icon: <Icon name={'dashboards/circle-alert'} size={16} />,
      title: 'JS Errors',
      description: 'Monitor JS errors affecting user experience.',
    },
    {
      icon: <ArrowUpDown width={16}/>,
      title: 'Top Network Requests',
      description: 'Identify the most frequent network requests.',
    },
    {
      icon: <WifiOff width={16}/>,
      title: '4xx/5xx Requests',
      description: 'Track client and server errors for performance issues.',
    },
    {
      icon: <Turtle width={16}/>,
      title: 'Slow Network Requests',
      description: 'Pinpoint the slowest network requests causing delays.',
    },
  ],
  web_analytics: [
    {
      icon: <FileStack width={16}/>,
      title: 'Top Pages',
      description: 'Discover the most visited pages on your site.',
    },
    {
      icon: <AppWindow width={16}/>,
      title: 'Top Browsers',
      description: 'Analyze the browsers your visitors are using the most.',
    },
    {
      icon: <Combine width={16}/>,
      title: 'Top Referrer',
      description: 'See where your traffic is coming from.',
    },
    {
      icon: <Users width={16}/>,
      title: 'Top Users',
      description: 'Identify the users with the most interactions.',
    },
    {
      icon: <ArrowDown10 width={16}/>,
      title: 'Speed Index by Country',
      description: 'Measure performance across different regions.',
    },
  ],
};

function CategoryTab({ tab }: { tab: string }) {
  const items = tabItems[tab];
  return (
    <div className={'flex flex-col'}>
      {items.map((item, index) => (
        <div key={index} className={'flex items-start gap-2 p-2'}>
          {item.icon}
          <div className={'leading-none'}>
            <div>{item.title}</div>
            <div className={'text-disabled-text text-sm'}>{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AddCardSection() {
  const [tab, setTab] = React.useState('product_analytics');
  const options = [
    { label: 'Product Analytics', value: 'product_analytics' },
    { label: 'Monitors', value: 'monitors' },
    { label: 'Web Analytics', value: 'web_analytics' },
  ];
  return (
    <div
      className={
        'm-10 py-4 px-8 rounded bg-white border border-gray-light flex flex-col gap-2 w-fit'
      }
    >
      <div className={'flex justify-between border-b border-b-gray-light p-2'}>
        <div className={'font-semibold text-lg'}>Add a card to dashboard</div>
        <div>Ask AI</div>
      </div>
      <div>
        <Segmented
          options={options}
          value={tab}
          onChange={(value) => setTab(value)}
        />
      </div>
      <CategoryTab tab={tab} />
      <div
        className={
          'w-full flex items-center justify-center border-t border-t-gray-light gap-2 pt-2'
        }
      >
        <FolderOutlined />
        <div className={'font-semibold'}>Add existing card</div>
      </div>
    </div>
  );
}

export default AddCardSection;

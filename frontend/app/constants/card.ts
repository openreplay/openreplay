import { IconNames } from 'App/components/ui/SVG';
import { FilterKey } from 'Types/filter/filterType';
import { MetricType } from 'App/components/Dashboard/components/MetricTypeItem/MetricTypeItem';
import { TFunction } from 'i18next';

export interface CardType {
  title: string;
  icon?: IconNames;
  description: string;
  slug: string;
  subTypes?: CardType[];
  disabled?: boolean;
}

export const LIBRARY = 'library';
export const TIMESERIES = 'timeseries';
export const TABLE = 'table';
export const HEATMAP = 'heatMap';
export const FUNNEL = 'funnel';
export const ERRORS = 'errors';
export const USER_PATH = 'pathAnalysis';
export const RETENTION = 'retention';
export const INSIGHTS = 'insights'; // SaaS and EE
export const PERFORMANCE = 'performance';

export const CATEGORIES = {
  product_analytics: 'product_analytics',
  monitors: 'monitors',
  web_analytics: 'web_analytics',
};

export interface Option {
  label: string;
  icon: string;
  value: string;
  description: string;
  disabled?: boolean;
}

export const TYPE_ICONS = {
  [LIBRARY]: 'grid',
  [TIMESERIES]: 'graph-up',
  [TABLE]: 'list-alt',
  [HEATMAP]: 'dashboards/heatmap-2',
  [FUNNEL]: 'funnel',
  [ERRORS]: 'exclamation-circle',
  [USER_PATH]: 'user-journey',
} as const;
export const TYPE_NAMES = (t: TFunction) =>
  ({
    [LIBRARY]: t('Library'),
    [TIMESERIES]: t('Trend'),
    [TABLE]: t('Table'),
    [HEATMAP]: t('Heatmap'),
    [FUNNEL]: t('Funnel'),
    [ERRORS]: t('Errors'),
    [USER_PATH]: t('Journeys'),
    [RETENTION]: t('Retention'),
    [INSIGHTS]: t('Insights'),
    [PERFORMANCE]: t('Performance'),
  }) as const;

export const TYPES: (t: TFunction) => CardType[] = (t) => [
  {
    title: t('Add from Library'),
    icon: TYPE_ICONS[LIBRARY],
    description: t('Select an existing card from your library'),
    slug: LIBRARY,
  },
  {
    title: TYPE_NAMES(t)[TIMESERIES],
    icon: TYPE_ICONS[TIMESERIES],
    description: t(
      'Combine captured events and filters to track trends over time.',
    ),
    slug: TIMESERIES,
    subTypes: [
      { title: t('Session Count'), slug: 'sessionCount', description: '' },
    ],
  },
  {
    title: TYPE_NAMES(t)[HEATMAP],
    icon: TYPE_ICONS[HEATMAP],
    description: t('See where users click and where they get frustrated.'),
    slug: HEATMAP,
    subTypes: [
      {
        title: t('Visited URL'),
        slug: FilterKey.CLICKMAP_URL,
        description: '',
      },
    ],
  },
  // {
  //   title: 'Table',
  //   icon: 'list-alt',
  //   description: 'Create custom tables of users, sessions, errors, issues and more.',
  //   slug: TABLE,
  //   subTypes: [
  //     { title: 'Users', slug: FilterKey.USERID, description: '' },
  //     { title: 'Sessions', slug: FilterKey.SESSIONS, description: '' },
  //     { title: 'JS Errors', slug: FilterKey.ERRORS, description: '' },
  //     { title: 'Issues', slug: FilterKey.ISSUE, description: '' },
  //     { title: 'Browser', slug: FilterKey.USER_BROWSER, description: '' },
  //     { title: 'Devices', slug: FilterKey.USER_DEVICE, description: '' },
  //     { title: 'Countries', slug: FilterKey.USER_COUNTRY, description: '' },
  //     { title: 'URLs', slug: FilterKey.LOCATION, description: '' },
  //   ],
  // },
  {
    title: TYPE_NAMES(t)[FUNNEL],
    icon: TYPE_ICONS[FUNNEL],
    description: t('Find out where users are dropping and understand why.'),
    slug: FUNNEL,
  },
  {
    title: TYPE_NAMES(t)[USER_PATH],
    icon: TYPE_ICONS[USER_PATH],
    description: t('See where users are flowing and explore their journeys.'),
    slug: USER_PATH,
  },
  // {
  //   title: 'Retention',
  //   icon: 'arrow-repeat',
  //   description: 'Get an understanding of how many users are returning.',
  //   slug: RETENTION,
  //   disabled: true,
  // },
  // {
  //   title: 'Feature Adoption',
  //   icon: 'card-checklist',
  //   description: 'See which features are used the most and how often.',
  //   slug: FEATURE_ADOPTION,
  // },
  // {
  //   title: 'Form Analysis',
  //   icon: 'card-checklist',
  //   description: 'Understand why users are not completing forms.',
  //   slug: FEATURE_ADOPTION,
  // },
];

export const DROPDOWN_OPTIONS = (t: TFunction) =>
  TYPES(t)
    .filter((i: MetricType) => i.slug !== LIBRARY)
    .map((i: MetricType) => ({
      label: i.title,
      icon: i.icon,
      value: i.slug,
      description: i.description,
    }));

import { IconNames } from 'App/components/ui/SVG';
import { FilterKey } from 'Types/filter/filterType';
import { MetricType } from 'App/components/Dashboard/components/MetricTypeItem/MetricTypeItem';

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
export const FEATURE_ADOPTION = 'featureAdoption';
export const INSIGHTS = 'insights';

export interface Option {
  label: string;
  icon: string;
  value: string;
  description: string;
  disabled?: boolean;
}

export const TYPES: CardType[] = [
  {
    title: 'Add from Library',
    icon: 'grid',
    description: 'Select an existing card from your library',
    slug: LIBRARY,
  },
  {
    title: 'Timeseries',
    icon: 'graph-up',
    description: 'Combine captured events and filters to track trends over time.',
    slug: TIMESERIES,
    subTypes: [{ title: 'Session Count', slug: 'sessionCount', description: '' }],
  },
  {
    title: 'Heatmap',
    icon: 'puzzle-piece',
    description: 'See where users click and where they get frustrated.',
    slug: HEATMAP,
    subTypes: [{ title: 'Visited URL', slug: FilterKey.CLICKMAP_URL, description: '' }],
  },
  {
    title: 'Table',
    icon: 'list-alt',
    description: 'Create custom tables of users, sessions, errors, issues and more.',
    slug: TABLE,
    subTypes: [
      { title: 'Users', slug: FilterKey.USERID, description: '' },
      { title: 'Sessions', slug: FilterKey.SESSIONS, description: '' },
      { title: 'JS Errors', slug: FilterKey.ERRORS, description: '' },
      { title: 'Issues', slug: FilterKey.ISSUE, description: '' },
      { title: 'Browser', slug: FilterKey.USER_BROWSER, description: '' },
      { title: 'Devices', slug: FilterKey.USER_DEVICE, description: '' },
      { title: 'Countries', slug: FilterKey.USER_COUNTRY, description: '' },
      { title: 'URLs', slug: FilterKey.LOCATION, description: '' },
    ],
  },
  {
    title: 'Funnel',
    icon: 'funnel',
    description: 'Find out where users are dropping and understand why.',
    slug: FUNNEL,
  },
  {
    title: 'Error Tracking',
    icon: 'exclamation-circle',
    description: 'Track API errors across domains and origins.',
    slug: ERRORS,
    subTypes: [
      { title: 'Errors by Origin', slug: FilterKey.RESOURCES_BY_PARTY, description: '' },
      { title: 'Errors per Domain', slug: FilterKey.ERRORS_PER_DOMAINS, description: '' },
      { title: 'Errors by type', slug: FilterKey.ERRORS_PER_TYPE, description: '' },
      { title: 'Calls with Errors', slug: FilterKey.CALLS_ERRORS, description: '' },
      { title: 'Top 4xx Domains', slug: FilterKey.DOMAINS_ERRORS_4XX, description: '' },
      { title: 'Top 5xx Domains', slug: FilterKey.DOMAINS_ERRORS_5XX, description: '' },
      {
        title: 'Impacted Sessions by JS Errors',
        slug: FilterKey.IMPACTED_SESSIONS_BY_JS_ERRORS,
        description: '',
      },
    ],
  },
  {
    title: 'Path Analysis',
    icon: 'signpost-split',
    description: 'See where users are flowing and explore their journeys.',
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
  {
    title: 'Insights',
    icon: 'lightbulb',
    description: 'Uncover new issues impacting user experience.',
    slug: INSIGHTS,
  },
  // {
  //   title: 'Form Analysis',
  //   icon: 'card-checklist',
  //   description: 'Understand why users are not completing forms.',
  //   slug: FEATURE_ADOPTION,
  // },
];

export const DROPDOWN_OPTIONS = TYPES.filter((i: MetricType) => i.slug !== LIBRARY).map(
  (i: MetricType) => ({
    label: i.title,
    icon: i.icon,
    value: i.slug,
    description: i.description,
  })
);

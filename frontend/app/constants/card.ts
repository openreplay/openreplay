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
export const CLICKMAP = 'clickMap';
export const FUNNEL = 'funnel';
export const ERRORS = 'errors';
export const PERFORMANCE = 'performance';
export const RESOURCE_MONITORING = 'resources';
export const WEB_VITALS = 'webVitals';
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
    title: 'Clickmap',
    icon: 'puzzle-piece',
    description: 'See where users click and where they get frustrated.',
    slug: CLICKMAP,
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
    title: 'Performance Tracking',
    icon: 'speedometer2',
    description: 'Uncover slowdowns and monitor CPU and memory consumption.',
    slug: PERFORMANCE,
    subTypes: [
      { title: 'CPU Load', slug: FilterKey.CPU, description: '' },
      { title: 'Crashes', slug: FilterKey.CRASHES, description: '' },
      { title: 'Frame Rate', slug: FilterKey.FPS, description: '' },
      { title: 'DOM Building Time', slug: FilterKey.PAGES_DOM_BUILD_TIME, description: '' },
      { title: 'Memory Consumption', slug: FilterKey.MEMORY_CONSUMPTION, description: '' },
      { title: 'Page Response Time', slug: FilterKey.PAGES_RESPONSE_TIME, description: '' },
      {
        title: 'Page Response Time Distribution',
        slug: FilterKey.PAGES_RESPONSE_TIME_DISTRIBUTION,
        description: '',
      },
      {
        title: 'Resources vs Visually Complete',
        slug: FilterKey.RESOURCES_VS_VISUALLY_COMPLETE,
        description: '',
      },
      { title: 'Sessions per Browser', slug: FilterKey.SESSIONS_PER_BROWSER, description: '' },
      { title: 'Slowest Domains', slug: FilterKey.SLOWEST_DOMAINS, description: '' },
      { title: 'Speed Index by Location', slug: FilterKey.SPEED_LOCATION, description: '' },
      { title: 'Time to Render', slug: FilterKey.TIME_TO_RENDER, description: '' },
      {
        title: 'Sessions Impacted by Slow Pages',
        slug: FilterKey.IMPACTED_SESSIONS_BY_SLOW_PAGES,
        description: '',
      },
    ],
  },
  {
    title: 'Resource Monitoring',
    icon: 'files',
    description: 'Identify missing resources and those slowing down your app.',
    slug: RESOURCE_MONITORING,
    subTypes: [
      {
        title: 'Breakdown of Loaded Resources',
        slug: FilterKey.BREAKDOWN_OF_LOADED_RESOURCES,
        description: '',
      },
      { title: 'Missing Resources', slug: FilterKey.MISSING_RESOURCES, description: '' },
      {
        title: 'Resource Type vs Response End',
        slug: FilterKey.RESOURCE_TYPE_VS_RESPONSE_END,
        description: '',
      },
      { title: 'Resource Fetch Time', slug: FilterKey.RESOURCE_FETCH_TIME, description: '' },
      { title: 'Slowest Resources', slug: FilterKey.SLOWEST_RESOURCES, description: '' },
    ],
  },
  {
    title: 'Web Vitals',
    icon: 'activity',
    description: 'Keep an eye on your web vitals and how they evolve over time.',
    slug: WEB_VITALS,
    subTypes: [
      { title: 'CPU Load', slug: FilterKey.AVG_CPU, description: '' },
      { title: 'DOM Content Loaded', slug: FilterKey.AVG_DOM_CONTENT_LOADED, description: '' },
      {
        title: 'DOM Content Loaded Start',
        slug: FilterKey.AVG_DOM_CONTENT_LOAD_START,
        description: '',
      },
      {
        title: 'First Meaningful Paint',
        slug: FilterKey.AVG_FIRST_CONTENTFUL_PIXEL,
        description: '',
      },
      { title: 'First Paint', slug: FilterKey.AVG_FIRST_PAINT, description: '' },
      { title: 'Frame Rate', slug: FilterKey.AVG_FPS, description: '' },
      { title: 'Image Load Time', slug: FilterKey.AVG_IMAGE_LOAD_TIME, description: '' },
      { title: 'Page Load Time', slug: FilterKey.AVG_PAGE_LOAD_TIME, description: '' },
      { title: 'DOM Build Time', slug: FilterKey.AVG_PAGES_DOM_BUILD_TIME, description: '' },
      { title: 'Pages Response Time', slug: FilterKey.AVG_PAGES_RESPONSE_TIME, description: '' },
      { title: 'Request Load Time', slug: FilterKey.AVG_REQUEST_LOADT_IME, description: '' },
      { title: 'Response Time ', slug: FilterKey.AVG_RESPONSE_TIME, description: '' },
      { title: 'Session Duration', slug: FilterKey.AVG_SESSION_DURATION, description: '' },
      { title: 'Time Till First Byte', slug: FilterKey.AVG_TILL_FIRST_BYTE, description: '' },
      { title: 'Time to be Interactive', slug: FilterKey.AVG_TIME_TO_INTERACTIVE, description: '' },
      { title: 'Time to Render', slug: FilterKey.AVG_TIME_TO_RENDER, description: '' },
      { title: 'JS Heap Size', slug: FilterKey.AVG_USED_JS_HEAP_SIZE, description: '' },
      { title: 'Visited Pages', slug: FilterKey.AVG_VISITED_PAGES, description: '' },
      { title: 'Captured Requests', slug: FilterKey.COUNT_REQUESTS, description: '' },
      { title: 'Captured Sessions', slug: FilterKey.COUNT_SESSIONS, description: '' },
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

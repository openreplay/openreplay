import { IconNames } from 'App/components/ui/SVG';
import { FilterKey, IssueType } from 'Types/filter/filterType';

export interface CardType {
  title: string;
  icon?: IconNames;
  description: string;
  slug: string;
  subTypes?: CardType[];
}

export const LIBRARY = 'library';
export const TIMESERIES = 'timeseries';
export const TABLE = 'table';

export const TYPES: CardType[] = [
  {
    title: 'Add From Library',
    icon: 'grid',
    description: 'Select a pre existing card from card library',
    slug: LIBRARY,
  },
  {
    title: 'Timeseries',
    icon: 'graph-up',
    description: 'Trend of sessions count in over the time.',
    slug: TIMESERIES,
    subTypes: [{ title: 'Session Count', slug: 'sessionCount', description: '' }],
  },
  {
    title: 'Table',
    icon: 'list-alt',
    description: 'See list of Users, Sessions, Errors, Issues, etc.,',
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
    description: 'Uncover the issues impacting user journeys.',
    slug: 'funnel',
  },
  {
    title: 'Errors Tracking',
    icon: 'exclamation-circle',
    description: 'Discover user journeys between 2 points.',
    slug: 'errors',
    subTypes: [
      { title: 'Resources by Party', slug: FilterKey.RESOURCES_BY_PARTY, description: '' },
      { title: 'Errors per Domains', slug: FilterKey.ERRORS_PER_DOMAINS, description: '' },
      { title: 'Errors per type', slug: FilterKey.ERRORS_PER_TYPE, description: '' },
      { title: 'Calls_Errors', slug: FilterKey.CALLS_ERRORS, description: '' },
      { title: 'Domains_Errors_4xx', slug: FilterKey.DOMAINS_ERRORS_4XX, description: '' },
      { title: 'Domains_Errors_5xx', slug: FilterKey.DOMAINS_ERRORS_5XX, description: '' },
      {
        title: 'Impacted_Sessions_By_Js_Errors',
        slug: FilterKey.IMPACTED_SESSIONS_BY_JS_ERRORS,
        description: '',
      },
    ],
  },
  {
    title: 'Performance Monitoring',
    icon: 'speedometer2',
    description: 'Retention graph of users / features over a period of time.',
    slug: 'performance',
    subTypes: [
      { title: 'Cpu', slug: FilterKey.CPU, description: '' },
      { title: 'Crashes', slug: FilterKey.CRASHES, description: '' },
      { title: 'Fps', slug: FilterKey.FPS, description: '' },
      { title: 'Pages_Dom_Build_Time', slug: FilterKey.PAGES_DOM_BUILD_TIME, description: '' },
      { title: 'Memory_Consumption', slug: FilterKey.MEMORY_CONSUMPTION, description: '' },
      { title: 'Pages_Response_Time', slug: FilterKey.PAGES_RESPONSE_TIME, description: '' },
      {
        title: 'Pages_Response_Time_Distribution',
        slug: FilterKey.PAGES_RESPONSE_TIME_DISTRIBUTION,
        description: '',
      },
      {
        title: 'Resources_Vs_Visually_Complete',
        slug: FilterKey.RESOURCES_VS_VISUALLY_COMPLETE,
        description: '',
      },
      { title: 'Sessions_Per_Browser', slug: FilterKey.SESSIONS_PER_BROWSER, description: '' },
      { title: 'Slowest_Domains', slug: FilterKey.SLOWEST_DOMAINS, description: '' },
      { title: 'Speed_Location', slug: FilterKey.SPEED_LOCATION, description: '' },
      { title: 'Time_To_Render', slug: FilterKey.TIME_TO_RENDER, description: '' },
      {
        title: 'Impacted_Sessions_By_Slow_Pages',
        slug: FilterKey.IMPACTED_SESSIONS_BY_SLOW_PAGES,
        description: '',
      },
    ],
  },
  {
    title: 'Resource Monitoring',
    icon: 'files',
    description: 'Find the adoption of your all features in your app.',
    slug: 'resource-monitoring',
    subTypes: [
      {
        title: 'Breakdown_Of_Loaded_Resources',
        slug: FilterKey.BREAKDOWN_OF_LOADED_RESOURCES,
        description: '',
      },
      { title: 'Missing_Resources', slug: FilterKey.MISSING_RESOURCES, description: '' },
      {
        title: 'Resource_Type_Vs_Response_End',
        slug: FilterKey.RESOURCE_TYPE_VS_RESPONSE_END,
        description: '',
      },
      { title: 'Resource_Fetch_Time', slug: FilterKey.RESOURCE_FETCH_TIME, description: '' },
      { title: 'Slowest_Resources', slug: FilterKey.SLOWEST_RESOURCES, description: '' },
    ],
  },
  {
    title: 'Web Vitals',
    icon: 'activity',
    description: 'Find the adoption of your all features in your app.',
    slug: 'web-vitals',
    subTypes: [
      {
        title: 'Resources_Count_By_Type',
        slug: FilterKey.RESOURCES_COUNT_BY_TYPE,
        description: '',
      },
      { title: 'Resources_Loading_Time', slug: FilterKey.RESOURCES_LOADING_TIME, description: '' },
      {
        title: 'CPU Load',
        slug: FilterKey.AVG_CPU,
        description: 'Uncover the issues impacting user journeys',
      },
      {
        title: 'DOM Build Time',
        slug: FilterKey.AVG_DOM_CONTENT_LOADED,
        description: 'Keep a close eye on errors and track their type, origin and domain.',
      },
      {
        title: 'DOM Content Loaded Start',
        slug: FilterKey.AVG_DOM_CONTENT_LOAD_START,
        description:
          'FInd out which resources are missing and those that may be slowign your web app.',
      },
      {
        title: 'DOM Content Loaded',
        slug: FilterKey.AVG_FIRST_CONTENTFUL_PIXEL,
        description:
          "Optimize your app's performance by tracking slow domains, page resposne times, memory consumption, CPU usage and more.",
      },
      {
        title: 'First Paint',
        slug: FilterKey.AVG_FIRST_PAINT,
        description:
          'Find out which resources are missing and those that may be slowing your web app.',
      },
      { title: 'Frame Rate', slug: FilterKey.AVG_FPS, description: '' },
      {
        title: 'Image Load Time',
        slug: FilterKey.AVG_IMAGE_LOAD_TIME,
        description:
          'Find out which resources are missing and those that may be slowing your web app.',
      },
      { title: 'Page Load Time', slug: FilterKey.AVG_PAGE_LOAD_TIME, description: '' },
      { title: 'DOM Build Time', slug: FilterKey.AVG_PAGES_DOM_BUILD_TIME, description: '' },
      { title: 'Pages Response Time', slug: FilterKey.AVG_PAGES_RESPONSE_TIME, description: '' },
      { title: 'Request Load Time', slug: FilterKey.AVG_REQUEST_LOADT_IME, description: '' },
      { title: 'Response Time ', slug: FilterKey.AVG_RESPONSE_TIME, description: '' },
      { title: 'Session Dueration', slug: FilterKey.AVG_SESSION_DURATION, description: '' },
      { title: 'Time Till First Byte', slug: FilterKey.AVG_TILL_FIRST_BYTE, description: '' },
      { title: 'Time to be Interactive', slug: FilterKey.AVG_TIME_TO_INTERACTIVE, description: '' },
      { title: 'Time to Render', slug: FilterKey.AVG_TIME_TO_RENDER, description: '' },
      { title: 'JS Heap Size', slug: FilterKey.AVG_USED_JS_HEAP_SIZE, description: '' },
      { title: 'Visited Pages', slug: FilterKey.AVG_VISITED_PAGES, description: '' },
      {
        title: 'Captured Requests',
        slug: FilterKey.COUNT_REQUESTS,
        description: 'Trend of sessions count in over the time.',
      },
      {
        title: 'Captured Sessions',
        slug: FilterKey.COUNT_SESSIONS,
        description: 'See list of users, sessions, errors, issues, etc.,',
      },
    ],
  },
  {
    title: 'User Path',
    icon: 'signpost-split',
    description: 'Discover user journeys between 2 points.',
    slug: 'user-path',
  },
  {
    title: 'Retention',
    icon: 'arrow-repeat',
    description: 'Retension graph of users / features over a period of time.',
    slug: 'retention',
  },
  {
    title: 'Feature Adoption',
    icon: 'card-checklist',
    description: 'Find the adoption of your all features in your app.',
    slug: 'feature-adoption',
  },
];

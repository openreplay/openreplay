/** Presets a new card starts from, picked by `?mk=<key>` on the card page. */
import { FilterKey } from 'Types/filter/filterType';
import { TFunction } from 'i18next';
import { BarChart, SearchSlash, TrendingUp } from 'lucide-react';

import {
  ERRORS,
  FUNNEL,
  HEATMAP,
  TABLE,
  TIMESERIES,
  USER_PATH,
  WEBVITALS,
} from 'App/constants/card';

export const CARD_CATEGORY = {
  PRODUCT_ANALYTICS: 'product-analytics',
  WEB_ANALYTICS: 'web-analytics',
  ERROR_TRACKING: 'error-tracking',
};

export const CARD_CATEGORIES = (t: TFunction) => [
  {
    key: CARD_CATEGORY.PRODUCT_ANALYTICS,
    label: t('Product Analytics'),
    icon: TrendingUp,
    types: [USER_PATH, ERRORS],
  },
  {
    key: CARD_CATEGORY.WEB_ANALYTICS,
    label: t('Web Analytics'),
    icon: BarChart,
    types: [TABLE],
  },
  {
    key: CARD_CATEGORY.ERROR_TRACKING,
    label: t('Monitors'),
    icon: SearchSlash,
    types: [],
  },
];

export interface CardType {
  title: string;
  key: string;
  cardType: string;
  category: string;
  metricOf?: string;
  width?: number;
  data?: any;
  height?: number;
  isEnterprise?: boolean;
  filters?: any;
  viewType?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const CARD_LIST: (t: TFunction) => CardType[] = (t) => [
  {
    title: 'Untitled Funnel',
    key: FUNNEL,
    cardType: FUNNEL,
    category: CARD_CATEGORIES(t)[0].key,
    width: 4,
    height: 300,
    metricOf: 'sessionCount',
    data: {
      stages: [
        {
          value: ['/sessions'],
          name: 'LOCATION',
          isEvent: true,
          autoCaptured: true,
          operator: 'contains',
          count: 1586,
          dropPct: null,
          filters: [],
          dropDueToIssues: 0,
        },
        {
          value: [],
          name: 'CLICK',
          isEvent: true,
          autoCaptured: true,
          operator: 'onAny',
          count: 1292,
          dropPct: 18,
          filters: [],
          dropDueToIssues: 294,
        },
      ],
      // totalDropDueToIssues: 294
    },
  },
  {
    title: 'Untitled Heatmaps',
    key: HEATMAP,
    cardType: HEATMAP,
    metricOf: 'heatMapUrl',
    category: CARD_CATEGORIES(t)[0].key,
    viewType: 'chart',
  },
  {
    title: 'Untitled Journey',
    key: USER_PATH,
    cardType: USER_PATH,
    category: CARD_CATEGORIES(t)[0].key,
    viewType: 'lineChart',
  },
  {
    title: 'Untitled Trend',
    key: TIMESERIES,
    cardType: TIMESERIES,
    metricOf: 'sessionCount',
    category: CARD_CATEGORIES(t)[0].key,
    data: {
      chart: generateTimeSeriesData(t),
      label: 'Number of Sessions',
      namesMap: ['Series 1'],
    },
  },
  {
    title: 'Untitled Users Trend',
    key: `${TIMESERIES}_userCount`,
    cardType: TIMESERIES,
    metricOf: 'userCount',
    category: CARD_CATEGORIES(t)[0].key,
    data: {
      chart: generateTimeSeriesData(t),
      label: 'Number of Users',
      namesMap: ['Series 1'],
    },
  },

  // Web analytics
  {
    title: 'Untitled Top Users',
    key: FilterKey.USERID,
    cardType: TABLE,
    metricOf: FilterKey.USERID,
    category: CARD_CATEGORIES(t)[1].key,
    viewType: 'table',
  },

  {
    title: 'Untitled Top Browsers',
    key: FilterKey.USER_BROWSER,
    cardType: TABLE,
    metricOf: FilterKey.USER_BROWSER,
    category: CARD_CATEGORIES(t)[1].key,
    viewType: 'table',
  },
  {
    title: 'Untitled Top Resolutions',
    key: FilterKey.RESOLUTIONS,
    cardType: TABLE,
    metricOf: FilterKey.RESOLUTIONS,
    category: CARD_CATEGORIES(t)[1].key,
    viewType: 'table',
  },
  // {
  //     title: 'Sessions by System',
  //     key: TYPE.SESSIONS_BY_SYSTEM,
  //     cardType: TABLE,
  //     metricOf: FilterKey.USER_OS,
  //     category: CARD_CATEGORIES(t)[1].key,
  // },
  {
    title: 'Untitled Top Countries',
    key: FilterKey.USER_COUNTRY,
    cardType: TABLE,
    metricOf: FilterKey.USER_COUNTRY,
    category: CARD_CATEGORIES(t)[1].key,
    viewType: 'table',
  },

  {
    title: 'Untitled Top Devices',
    key: FilterKey.USER_DEVICE,
    cardType: TABLE,
    metricOf: FilterKey.USER_DEVICE,
    category: CARD_CATEGORIES(t)[1].key,
    viewType: 'table',
  },
  {
    title: 'Untitled Top Pages',
    key: FilterKey.LOCATION,
    cardType: TABLE,
    metricOf: FilterKey.LOCATION,
    category: CARD_CATEGORIES(t)[1].key,
    viewType: 'table',
  },

  {
    title: 'Untitled Top Referrer',
    key: FilterKey.REFERRER,
    cardType: TABLE,
    metricOf: FilterKey.REFERRER,
    category: CARD_CATEGORIES(t)[1].key,
    viewType: 'table',
  },

  // Monitors
  {
    title: 'Untitled Table of Errors',
    key: FilterKey.ERRORS,
    cardType: TABLE,
    metricOf: FilterKey.ERRORS,
    category: CARD_CATEGORIES(t)[2].key,
    data: {
      chart: generateBarChartData(t),
      hideLegend: true,
      label: 'Number of Sessions',
    },
    width: 4,
    height: 336,
    viewType: 'table',
    sortBy: 'time',
    sortOrder: 'desc',
  },
  {
    title: 'Untitled Top Network Requests',
    key: FilterKey.FETCH,
    cardType: TABLE,
    metricOf: FilterKey.FETCH,
    category: CARD_CATEGORIES(t)[2].key,
    viewType: 'table',
  },
  {
    title: 'Untitled Sessions with 4xx/5xx Requests',
    key: `${TIMESERIES}_4xx_requests`,
    cardType: TIMESERIES,
    metricOf: 'sessionCount',
    category: CARD_CATEGORY.ERROR_TRACKING,
    data: {
      chart: generateTimeSeriesData(t),
      label: 'Number of Sessions',
      namesMap: ['Series 1'],
    },
    filters: [
      {
        name: 'REQUEST',
        isEvent: true,
        autoCaptured: true,
        value: [],
        operator: 'is',
        filters: [
          {
            name: 'status',
            dataType: 'number',
            autoCaptured: true,
            isEvent: false,
            operator: '>=',
            value: ['400'],
            filters: [],
          },
        ],
      },
    ],
  },
  {
    title: 'Untitled Sessions with Slow Network Requests',
    key: `${TIMESERIES}_slow_network_requests`,
    cardType: TIMESERIES,
    metricOf: 'sessionCount',
    category: CARD_CATEGORY.ERROR_TRACKING,
    data: {
      chart: generateTimeSeriesData(t),
      label: 'Number of Sessions',
      namesMap: ['Series 1'],
    },
    filters: [
      {
        name: 'REQUEST',
        isEvent: true,
        value: [],
        operator: 'is',
        autoCaptured: true,
        filters: [
          {
            name: 'duration',
            dataType: 'number',
            autoCaptured: true,
            isEvent: false,
            value: ['5000'],
            operator: '>=',
            filters: [],
          },
        ],
      },
    ],
  },
  {
    title: 'Untitled Web Vitals',
    key: WEBVITALS,
    cardType: WEBVITALS,
    metricOf: 'webVitalUrl',
    category: CARD_CATEGORY.WEB_ANALYTICS,
    data: {},
    viewType: 'chart',
    filters: [
      {
        name: 'LOCATION',
        autoCaptured: true,
        isEvent: true,
        operator: 'isAny',
      },
    ],
  },
];

function generateTimeSeriesData(t: TFunction): any[] {
  const months = [
    t('Jan'),
    t('Feb'),
    t('Mar'),
    t('Apr'),
    t('May'),
    t('Jun'),
    t('Jul'),
  ];
  const pointsPerMonth = 3; // Number of points for each month

  const data = months.flatMap((month, monthIndex) =>
    Array.from({ length: pointsPerMonth }, (_, pointIndex) => ({
      time: month,
      'Series 1': Math.floor(Math.random() * 90),
      timestamp:
        Date.now() + (monthIndex * pointsPerMonth + pointIndex) * 86400000,
    })),
  );

  return data;
}

function generateAreaData(t: TFunction): any[] {
  const months = [
    t('Jan'),
    t('Feb'),
    t('Mar'),
    t('Apr'),
    t('May'),
    t('Jun'),
    t('Jul'),
  ];
  const pointsPerMonth = 3; // Number of points for each month

  const data = months.flatMap((month, monthIndex) =>
    Array.from({ length: pointsPerMonth }, (_, pointIndex) => ({
      time: month,
      value: Math.floor(Math.random() * 90),
      timestamp:
        Date.now() + (monthIndex * pointsPerMonth + pointIndex) * 86400000,
    })),
  );

  return data;
}

function generateRandomValue(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBarChartData(t: TFunction): any[] {
  const months = [
    t('Jan'),
    t('Feb'),
    t('Mar'),
    t('Apr'),
    t('May'),
    t('Jun'),
    t('Jul'),
  ];
  return months.map((month) => ({
    time: month,
    value: generateRandomValue(1000, 5000),
  }));
}

function generateStackedBarChartData(keys: any, t: TFunction): any[] {
  const months = [
    t('Jan'),
    t('Feb'),
    t('Mar'),
    t('Apr'),
    t('May'),
    t('Jun'),
    t('Jul'),
  ];
  return months.map((month) => ({
    time: month,
    ...keys.reduce((acc: any, key: any) => {
      acc[key] = generateRandomValue(1000, 5000);
      return acc;
    }, {}),
  }));
}

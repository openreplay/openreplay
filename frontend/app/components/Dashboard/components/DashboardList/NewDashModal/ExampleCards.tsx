import ExampleFunnel from './Examples/Funnel';
import ExamplePath from './Examples/Path';
import ExampleTrend from './Examples/Trend';
import ByBrowser from './Examples/SessionsBy/ByBrowser';
import BySystem from './Examples/SessionsBy/BySystem';
import ByCountry from './Examples/SessionsBy/ByCountry';
import ByUrl from './Examples/SessionsBy/ByUrl';
import {
  HEATMAP,
  ERRORS,
  FUNNEL,
  INSIGHTS,
  TABLE,
  TIMESERIES,
  USER_PATH,
  PERFORMANCE, RETENTION
} from "App/constants/card";
import { FilterKey } from 'Types/filter/filterType';
import { BarChart, TrendingUp, SearchSlash } from 'lucide-react';
import ByIssues from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByIssues';
import InsightsExample from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/InsightsExample';
import ByUser from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByUser';
import BarChartCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/BarChart';
import SpeedIndexByLocationExample
  from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SpeedIndexByLocationExample';
import CallsWithErrorsExample
  from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/CallsWithErrorsExample';
import SlowestDomains
  from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/SlowestDomains';
import HeatmapsExample from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/HeatmapsExample';
import ByReferrer from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByRferrer';
import ByFetch from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByFecth';
import TableOfErrors from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/TableOfErrors';

export const CARD_CATEGORY = {
  PRODUCT_ANALYTICS: 'product-analytics',
  WEB_ANALYTICS: 'web-analytics',
  ERROR_TRACKING: 'error-tracking',
};

export const CARD_CATEGORIES = [
  { key: CARD_CATEGORY.PRODUCT_ANALYTICS, label: 'Product Analytics', icon: TrendingUp, types: [USER_PATH, ERRORS] },
  { key: CARD_CATEGORY.WEB_ANALYTICS, label: 'Web Analytics', icon: BarChart, types: [TABLE] },
  { key: CARD_CATEGORY.ERROR_TRACKING, label: 'Monitors', icon: SearchSlash, types: [] },
];

export interface CardType {
  title: string;
  key: string;
  cardType: string;
  category: string;
  example: any;
  metricOf?: string;
  width?: number;
  data?: any;
  height?: number;
  isEnterprise?: boolean;
  filters?: any;
}

export const CARD_LIST: CardType[] = [
  {
    title: 'Funnel',
    key: FUNNEL,
    cardType: FUNNEL,
    category: CARD_CATEGORIES[0].key,
    example: ExampleFunnel,
    width: 4,
    height: 300,
    data: {
      stages: [
        {
          'value': [
            '/sessions'
          ],
          'type': 'location',
          'operator': 'contains',
          'count': 1586,
          'dropPct': null,
          'dropDueToIssues': 0
        },
        {
          'value': [],
          'type': 'click',
          'operator': 'onAny',
          'count': 1292,
          'dropPct': 18,
          'dropDueToIssues': 294
        }
      ],
      // totalDropDueToIssues: 294
    }
  },
  {
    title: 'Heatmaps',
    key: HEATMAP,
    cardType: HEATMAP,
    metricOf: 'heatMapUrl',
    category: CARD_CATEGORIES[0].key,
    example: HeatmapsExample
  },
  {
    title: 'Journey',
    key: USER_PATH,
    cardType: USER_PATH,
    category: CARD_CATEGORIES[0].key,
    example: ExamplePath
  },
  {
    title: 'Trend',
    key: TIMESERIES,
    cardType: TIMESERIES,
    metricOf: 'sessionCount',
    category: CARD_CATEGORIES[0].key,
    data: {
      chart: generateTimeSeriesData(),
      label: 'Number of Sessions',
      namesMap: [
        'Series 1'
      ]
    },
    example: ExampleTrend
  },
  {
    title: 'Users Trend',
    key: TIMESERIES + '_userCount',
    cardType: TIMESERIES,
    metricOf: 'userCount',
    category: CARD_CATEGORIES[0].key,
    data: {
      chart: generateTimeSeriesData(),
      label: 'Number of Users',
      namesMap: [
        'Series 1'
      ]
    },
    example: ExampleTrend
  },


  // Web analytics
  {
    title: 'Top Users',
    key: FilterKey.USERID,
    cardType: TABLE,
    metricOf: FilterKey.USERID,
    category: CARD_CATEGORIES[1].key,
    example: ByUser
  },

  {
    title: 'Top Browsers',
    key: FilterKey.USER_BROWSER,
    cardType: TABLE,
    metricOf: FilterKey.USER_BROWSER,
    category: CARD_CATEGORIES[1].key,
    example: ByBrowser
  },
  // {
  //     title: 'Sessions by System',
  //     key: TYPE.SESSIONS_BY_SYSTEM,
  //     cardType: TABLE,
  //     metricOf: FilterKey.USER_OS,
  //     category: CARD_CATEGORIES[1].key,
  //     example: BySystem,
  // },
  {
    title: 'Top Countries',
    key: FilterKey.USER_COUNTRY,
    cardType: TABLE,
    metricOf: FilterKey.USER_COUNTRY,
    category: CARD_CATEGORIES[1].key,
    example: ByCountry
  },

  {
    title: 'Top Devices',
    key: FilterKey.USER_DEVICE,
    cardType: TABLE,
    metricOf: FilterKey.USER_DEVICE,
    category: CARD_CATEGORIES[1].key,
    example: BySystem
  },
  {
    title: 'Top Pages',
    key: FilterKey.LOCATION,
    cardType: TABLE,
    metricOf: FilterKey.LOCATION,
    category: CARD_CATEGORIES[1].key,
    example: ByUrl
  },

  {
    title: 'Top Referrer',
    key: FilterKey.REFERRER,
    cardType: TABLE,
    metricOf: FilterKey.REFERRER,
    category: CARD_CATEGORIES[1].key,
    example: ByReferrer
  },

  // Monitors
  {
    title: 'Table of Errors',
    key: FilterKey.ERRORS,
    cardType: TABLE,
    metricOf: FilterKey.ERRORS,
    category: CARD_CATEGORIES[2].key,
    data: {
      chart: generateBarChartData(),
      hideLegend: true,
      label: 'Number of Sessions'
    },
    width: 4,
    height: 336,
    example: TableOfErrors
  },
  {
    title: 'Top Network Requests',
    key: FilterKey.FETCH,
    cardType: TABLE,
    metricOf: FilterKey.FETCH,
    category: CARD_CATEGORIES[2].key,
    example: ByFetch
  },
  {
    title: 'Sessions with 4xx/5xx Requests',
    key: TIMESERIES + '_4xx_requests',
    cardType: TIMESERIES,
    metricOf: 'sessionCount',
    category: CARD_CATEGORY.ERROR_TRACKING,
    data: {
      chart: generateTimeSeriesData(),
      label: 'Number of Sessions',
      namesMap: [
        'Series 1'
      ]
    },
    filters: [
      {
        "type": "fetch",
        "isEvent": true,
        "value": [],
        "operator": "is",
        "filters": [
          {
            "type": "fetchStatusCode",
            "isEvent": false,
            "value": [
              "400"
            ],
            "operator": ">=",
            "filters": []
          },
        ]
      }
    ],
    example: ExampleTrend
  },
  {
    title: 'Sessions with Slow Network Requests',
    key: TIMESERIES + '_slow_network_requests',
    cardType: TIMESERIES,
    metricOf: 'sessionCount',
    category: CARD_CATEGORY.ERROR_TRACKING,
    data: {
      chart: generateTimeSeriesData(),
      label: 'Number of Sessions',
      namesMap: [
        'Series 1'
      ]
    },
    filters: [
      {
        "type": "fetch",
        "isEvent": true,
        "value": [],
        "operator": "is",
        "filters": [
          {
            "type": "fetchDuration",
            "isEvent": false,
            "value": [
              "5000"
            ],
            "operator": ">=",
            "filters": []
          },
        ]
      }
    ],
    example: ExampleTrend
  },
];

function generateTimeSeriesData(): any[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const pointsPerMonth = 3; // Number of points for each month

  const data = months.flatMap((month, monthIndex) =>
    Array.from({ length: pointsPerMonth }, (_, pointIndex) => ({
      time: month,
      'Series 1': Math.floor(Math.random() * 90),
      timestamp: Date.now() + (monthIndex * pointsPerMonth + pointIndex) * 86400000
    }))
  );

  return data;
}

function generateAreaData(): any[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const pointsPerMonth = 3; // Number of points for each month

  const data = months.flatMap((month, monthIndex) =>
    Array.from({ length: pointsPerMonth }, (_, pointIndex) => ({
      time: month,
      'value': Math.floor(Math.random() * 90),
      timestamp: Date.now() + (monthIndex * pointsPerMonth + pointIndex) * 86400000
    }))
  );

  return data;
}

function generateRandomValue(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBarChartData(): any[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  return months.map(month => ({
    time: month,
    value: generateRandomValue(1000, 5000)
  }));
}

function generateStackedBarChartData(keys: any): any[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  return months.map(month => ({
    time: month,
    ...keys.reduce((acc: any, key: any) => {
      acc[key] = generateRandomValue(1000, 5000);
      return acc;
    }, {})
  }));
}

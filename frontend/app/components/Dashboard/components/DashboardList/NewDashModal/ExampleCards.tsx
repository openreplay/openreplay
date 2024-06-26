import ExampleFunnel from "./Examples/Funnel";
import ExamplePath from "./Examples/Path";
import ExampleTrend from "./Examples/Trend";
import ExampleCount from "./Examples/Count";
import PerfBreakdown from "./Examples/PerfBreakdown";
import SlowestDomain from "./Examples/SlowestDomain";
import SessionsByErrors from "./Examples/SessionsByErrors";
import SessionsByIssues from "./Examples/SessionsByIssues";
import ByBrowser from "./Examples/SessionsBy/ByBrowser";
import BySystem from "./Examples/SessionsBy/BySystem";
import ByCountry from "./Examples/SessionsBy/ByCountry";
import ByUrl from "./Examples/SessionsBy/ByUrl";
import {ERRORS, FUNNEL, PERFORMANCE, TABLE, TIMESERIES, USER_PATH, WEB_VITALS} from "App/constants/card";
import {FilterKey} from "Types/filter/filterType";
import {Activity, BarChart, TableCellsMerge, TrendingUp} from "lucide-react";
import WebVital from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/WebVital";
import Trend from "./Examples/Trend";
import ErrorsPerDomain from "Components/Dashboard/Widgets/PredefinedWidgets/ErrorsPerDomain";
import Bars from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/Bars";
import SessionsBy from "Components/Dashboard/Widgets/CustomMetricsWidgets/SessionsBy";
import ByIssues from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByIssues";

const TYPE = {
    FUNNEL: 'funnel',
    PATH_FINDER: 'path-finder',
    TREND: 'trend',
    SESSIONS_BY: 'sessions-by',
    BREAKDOWN: 'breakdown',
    SLOWEST_DOMAIN: 'slowest-domain',
    SESSIONS_BY_ERRORS: 'sessions-by-errors',
    SESSIONS_BY_ISSUES: 'sessions-by-issues',
    SESSIONS_BY_BROWSER: 'sessions-by-browser',
    SESSIONS_BY_SYSTEM: 'sessions-by-system',
    SESSIONS_BY_COUNTRY: 'sessions-by-country',
    SESSIONS_BY_URL: 'sessions-by-url',


    ERRORS_JS: 'js-errors',
    ERRORS_BY_ORIGIN: 'errors-by-origin',
    ERRORS_BY_DOMAIN: 'errors-by-domain',
    ERRORS_BY_TYPE: 'errors-by-type',
    CALLS_WITH_ERRORS: 'calls-with-errors',
    ERRORS_4XX: '4xx-errors',
    ERRORS_5XX: '5xx-errors',
}

export const CARD_CATEGORY = {
    PRODUCT_ANALYTICS: 'product-analytics',
    PERFORMANCE_MONITORING: 'performance-monitoring',
    WEB_ANALYTICS: 'web-analytics',
    ERROR_TRACKING: 'error-tracking',
}

export const CARD_CATEGORIES = [
    {key: CARD_CATEGORY.PRODUCT_ANALYTICS, label: 'Product Analytics', icon: TrendingUp, types: [USER_PATH, ERRORS]},
    {key: CARD_CATEGORY.PERFORMANCE_MONITORING, label: 'Performance Monitoring', icon: Activity, types: [TIMESERIES]},
    {key: CARD_CATEGORY.WEB_ANALYTICS, label: 'Web Analytics', icon: BarChart, types: [TABLE]},
    {key: CARD_CATEGORY.ERROR_TRACKING, label: 'Errors Tracking', icon: TableCellsMerge, types: [WEB_VITALS]}
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
}

export const CARD_LIST: CardType[] = [
    {
        title: 'Funnel',
        key: FUNNEL,
        cardType: FUNNEL,
        category: CARD_CATEGORIES[0].key,
        example: ExampleFunnel,
    },
    {
        title: 'Path Finder',
        key: USER_PATH,
        cardType: USER_PATH,
        category: CARD_CATEGORIES[0].key,
        example: ExamplePath,
    },
    {
        title: 'Trend',
        key: TYPE.TREND,
        cardType: TIMESERIES,
        category: CARD_CATEGORIES[0].key,
        example: ExampleTrend,
    },

    {
        title: 'Sessions by Issues',
        key: FilterKey.ISSUE,
        cardType: TABLE,
        metricOf: FilterKey.ISSUE,
        category: CARD_CATEGORIES[0].key,
        example: ByIssues,
    },

    // Performance Monitoring
    {
        title: 'CPU Load',
        key: FilterKey.AVG_CPU,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_CPU,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },
    {
        title: 'DOM Content Loaded',
        key: FilterKey.AVG_DOM_CONTENT_LOADED,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_DOM_CONTENT_LOADED,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'DOM Content Loadeded Start',
        key: FilterKey.AVG_DOM_CONTENT_LOAD_START,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_DOM_CONTENT_LOAD_START,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'First Meaningful Paint',
        key: FilterKey.AVG_FIRST_CONTENTFUL_PIXEL,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_FIRST_CONTENTFUL_PIXEL,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'First Paint',
        key: FilterKey.AVG_FIRST_PAINT,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_FIRST_PAINT,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Frame Rate',
        key: FilterKey.AVG_FPS,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_FPS,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Image Load Time',
        key: FilterKey.AVG_IMAGE_LOAD_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_IMAGE_LOAD_TIME,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Page Load Time',
        key: FilterKey.AVG_PAGE_LOAD_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_PAGE_LOAD_TIME,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'DOM Build Time',
        key: FilterKey.AVG_PAGES_DOM_BUILD_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_PAGES_DOM_BUILD_TIME,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Page Response Time',
        key: FilterKey.AVG_PAGES_RESPONSE_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_PAGES_RESPONSE_TIME,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Request Load Time',
        key: FilterKey.AVG_REQUEST_LOADT_IME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_REQUEST_LOADT_IME,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },
    {
        title: 'Response Time',
        key: FilterKey.AVG_RESPONSE_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_RESPONSE_TIME,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Session Duration',
        key: FilterKey.AVG_SESSION_DURATION,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_SESSION_DURATION,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Time Till First Byte',
        key: FilterKey.AVG_TILL_FIRST_BYTE,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_TILL_FIRST_BYTE,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Time to be Interactive',
        key: FilterKey.AVG_TIME_TO_INTERACTIVE,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_TIME_TO_INTERACTIVE,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'Time to Render',
        key: FilterKey.AVG_TIME_TO_RENDER,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_TIME_TO_RENDER,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    {
        title: 'JS Heap Size',
        key: FilterKey.AVG_USED_JS_HEAP_SIZE,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_USED_JS_HEAP_SIZE,
        category: CARD_CATEGORIES[1].key,
        width: 1,
        height: 148,
        example: WebVital,
    },

    // {
    //     title: 'Captured Requests',
    //     key: WEB_VITALS,
    //     cardType: WEB_VITALS,
    //     // metricOf: FilterKey.AVG_DOM_CONTENT_LOADED,
    //     category: CARD_CATEGORIES[1].key,
    //     width: 1,
    //     example: WebVital,
    // },


    {
        title: 'Breakdown',
        key: TYPE.BREAKDOWN,
        cardType: PERFORMANCE,
        category: CARD_CATEGORIES[1].key,
        example: PerfBreakdown,
    },
    {
        title: 'Slowest Domain',
        key: TYPE.SLOWEST_DOMAIN,
        cardType: TIMESERIES,
        category: CARD_CATEGORIES[1].key,
        example: SlowestDomain,
    },

    {
        title: 'Sessions by Errors',
        key: TYPE.SESSIONS_BY_ERRORS,
        cardType: TIMESERIES,
        category: CARD_CATEGORIES[1].key,
        example: SessionsByErrors,
    },

    {
        title: 'Sessions by Users',
        key: FilterKey.USERID,
        cardType: TABLE,
        metricOf: FilterKey.USERID,
        category: CARD_CATEGORIES[2].key,
        example: ByBrowser,
    },

    {
        title: 'Sessions by Browser',
        key: FilterKey.USER_BROWSER,
        cardType: TABLE,
        metricOf: FilterKey.USER_BROWSER,
        category: CARD_CATEGORIES[2].key,
        example: ByBrowser,
    },
    // {
    //     title: 'Sessions by System',
    //     key: TYPE.SESSIONS_BY_SYSTEM,
    //     cardType: TABLE,
    //     metricOf: FilterKey.USER_OS,
    //     category: CARD_CATEGORIES[2].key,
    //     example: BySystem,
    // },
    {
        title: 'Sessions by Country',
        key: FilterKey.USER_COUNTRY,
        cardType: TABLE,
        metricOf: FilterKey.USER_COUNTRY,
        category: CARD_CATEGORIES[2].key,
        example: ByCountry,
    },

    {
        title: 'Sessions by Device',
        key: FilterKey.USER_DEVICE,
        cardType: TABLE,
        metricOf: FilterKey.USER_DEVICE,
        category: CARD_CATEGORIES[2].key,
        example: BySystem,
    },
    {
        title: 'Sessions by URL',
        key: FilterKey.LOCATION,
        cardType: TABLE,
        metricOf: FilterKey.LOCATION,
        category: CARD_CATEGORIES[2].key,
        example: ByUrl,
    },

    // Errors Tracking
    {
        title: 'JS Errors',
        key: FilterKey.IMPACTED_SESSIONS_BY_JS_ERRORS,
        cardType: TABLE,
        metricOf: FilterKey.IMPACTED_SESSIONS_BY_JS_ERRORS,
        category: CARD_CATEGORIES[3].key,
        example: PerfBreakdown,
    },
    {
        title: 'Errors by Origin',
        key: FilterKey.RESOURCES_BY_PARTY,
        cardType: TABLE,
        metricOf: FilterKey.RESOURCES_BY_PARTY,
        category: CARD_CATEGORIES[3].key,
        example: PerfBreakdown,
    },
    {
        title: 'Errors by Domain',
        key: FilterKey.ERRORS_PER_DOMAINS,
        cardType: TABLE,
        metricOf: FilterKey.ERRORS_PER_DOMAINS,
        category: CARD_CATEGORIES[3].key,
        example: Bars,
        data: {
            total: 90,
            values: [
                {
                    "label": "company.domain.com",
                    "value": 89
                },
                {
                    "label": "openreplay.com",
                    "value": 15
                }
            ]
        }
    },

    {
        title: 'Errors by Type',
        key: FilterKey.ERRORS_PER_TYPE,
        cardType: TABLE,
        metricOf: FilterKey.ERRORS_PER_TYPE,
        category: CARD_CATEGORIES[3].key,
        example: PerfBreakdown,
    },
    {
        title: 'Calls with Errors',
        key: FilterKey.CALLS_ERRORS,
        cardType: TABLE,
        metricOf: FilterKey.CALLS_ERRORS,
        category: CARD_CATEGORIES[3].key,
        example: PerfBreakdown,
    },

    {
        title: '4xx Domains',
        key: FilterKey.DOMAINS_ERRORS_4XX,
        cardType: TABLE,
        metricOf: FilterKey.DOMAINS_ERRORS_4XX,
        category: CARD_CATEGORIES[3].key,
        example: Trend,
    },

    {
        title: '5xx Domains',
        key: FilterKey.DOMAINS_ERRORS_5XX,
        cardType: TABLE,
        metricOf: FilterKey.DOMAINS_ERRORS_5XX,
        category: CARD_CATEGORIES[3].key,
        example: Trend,
    },
]

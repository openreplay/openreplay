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
}

export const CARD_CATEGORIES = [
    {
        key: 'product-analytics', label: 'Product Analytics', icon: TrendingUp, types: [USER_PATH, ERRORS]
    },
    {key: 'performance-monitoring', label: 'Performance Monitoring', icon: Activity, types: [TIMESERIES]},
    {key: 'web-analytics', label: 'Web Analytics', icon: BarChart, types: [TABLE]},
    {key: 'core-web-vitals', label: 'Core Web Vitals', icon: TableCellsMerge, types: [WEB_VITALS]}
];

export interface CardType {
    title: string;
    key: string;
    cardType: string;
    category: string;
    example: any;
    metricOf?: string;
}

export const CARD_LIST: CardType[] = [
    {
        title: 'Funnel',
        key: TYPE.FUNNEL,
        cardType: FUNNEL,
        category: CARD_CATEGORIES[0].key,
        example: ExampleFunnel,
    },
    {
        title: 'Path Finder',
        key: TYPE.PATH_FINDER,
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
        title: 'Sessions by',
        key: TYPE.SESSIONS_BY,
        cardType: TABLE,
        metricOf: 'userBrowser',
        category: CARD_CATEGORIES[0].key,
        example: ExampleCount,
    },

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
        title: 'Sessions by Issues',
        key: TYPE.SESSIONS_BY_ISSUES,
        cardType: TIMESERIES,
        category: CARD_CATEGORIES[1].key,
        example: SessionsByIssues,
    },

    {
        title: 'Sessions by Browser',
        key: TYPE.SESSIONS_BY_BROWSER,
        cardType: TABLE,
        metricOf: FilterKey.USER_BROWSER,
        category: CARD_CATEGORIES[2].key,
        example: ByBrowser,
    },
    {
        title: 'Sessions by System',
        key: TYPE.SESSIONS_BY_SYSTEM,
        cardType: TABLE,
        metricOf: FilterKey.USER_OS,
        category: CARD_CATEGORIES[2].key,
        example: BySystem,
    },
    {
        title: 'Sessions by Country',
        key: TYPE.SESSIONS_BY_COUNTRY,
        cardType: TABLE,
        metricOf: FilterKey.USER_COUNTRY,
        category: CARD_CATEGORIES[2].key,
        example: ByCountry,
    },
    {
        title: 'Sessions by URL',
        key: TYPE.SESSIONS_BY_URL,
        cardType: TABLE,
        metricOf: FilterKey.LOCATION,
        category: CARD_CATEGORIES[2].key,
        example: ByUrl,
    },
]

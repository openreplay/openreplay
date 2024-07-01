import ExampleFunnel from "./Examples/Funnel";
import ExamplePath from "./Examples/Path";
import ExampleTrend from "./Examples/Trend";
import Trend from "./Examples/Trend";
import PerfBreakdown from "./Examples/PerfBreakdown";
import ByBrowser from "./Examples/SessionsBy/ByBrowser";
import BySystem from "./Examples/SessionsBy/BySystem";
import ByCountry from "./Examples/SessionsBy/ByCountry";
import ByUrl from "./Examples/SessionsBy/ByUrl";
import {ERRORS, FUNNEL, INSIGHTS, PERFORMANCE, TABLE, TIMESERIES, USER_PATH, WEB_VITALS} from "App/constants/card";
import {FilterKey} from "Types/filter/filterType";
import {Activity, BarChart, TableCellsMerge, TrendingUp} from "lucide-react";
import WebVital from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/WebVital";
import Bars from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/Bars";
import ByIssues from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByIssues";
import InsightsExample from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/InsightsExample";
import ByUser from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByUser";
import BarChartCard from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/BarChart";
import AreaChartCard from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/AreaChartCard";
import CallsWithErrorsExample
    from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/CallsWithErrorsExample";
import SessionsPerBrowserExample
    from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsPerBrowserExample';
import SlowestDomains
    from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/SlowestDomains';

export const CARD_CATEGORY = {
    PRODUCT_ANALYTICS: 'product-analytics',
    PERFORMANCE_MONITORING: 'performance-monitoring',
    WEB_ANALYTICS: 'web-analytics',
    ERROR_TRACKING: 'error-tracking',
    WEB_VITALS: 'web-vitals',
}

export const CARD_CATEGORIES = [
    {key: CARD_CATEGORY.PRODUCT_ANALYTICS, label: 'Product Analytics', icon: TrendingUp, types: [USER_PATH, ERRORS]},
    {key: CARD_CATEGORY.PERFORMANCE_MONITORING, label: 'Performance Monitoring', icon: Activity, types: [TIMESERIES]},
    {key: CARD_CATEGORY.WEB_ANALYTICS, label: 'Web Analytics', icon: BarChart, types: [TABLE]},
    {key: CARD_CATEGORY.ERROR_TRACKING, label: 'Errors Tracking', icon: TableCellsMerge, types: [WEB_VITALS]},
    {key: CARD_CATEGORY.WEB_VITALS, label: 'Web Vitals', icon: TableCellsMerge, types: [WEB_VITALS]}
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
        width: 4,
        height: 356,
        data: {
            stages: [
                {
                    "value": [
                        "/sessions"
                    ],
                    "type": "location",
                    "operator": "contains",
                    "sessionsCount": 1586,
                    "dropPct": null,
                    "usersCount": 470,
                    "dropDueToIssues": 0
                },
                {
                    "value": [],
                    "type": "click",
                    "operator": "onAny",
                    "sessionsCount": 1292,
                    "dropPct": 18,
                    "usersCount": 450,
                    "dropDueToIssues": 294
                }
            ],
            totalDropDueToIssues: 294
        }
    },
    {
        title: 'Path Finder',
        key: USER_PATH,
        cardType: USER_PATH,
        category: CARD_CATEGORIES[0].key,
        example: ExamplePath,
    },
    {
        title: 'Sessions Trend',
        key: TIMESERIES,
        cardType: TIMESERIES,
        metricOf: 'sessionCount',
        category: CARD_CATEGORIES[0].key,
        data: {
            chart: generateTimeSeriesData(),
            label: "Number of Sessions",
            namesMap: [
                "Series 1"
            ]
        },
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

    {
        title: 'Insights',
        key: INSIGHTS,
        cardType: INSIGHTS,
        metricOf: 'issueCategories',
        category: CARD_CATEGORIES[0].key,
        width: 4,
        example: InsightsExample,
    },

    // Performance Monitoring
    {
        title: 'CPU Load',
        key: FilterKey.CPU,
        cardType: PERFORMANCE,
        metricOf: FilterKey.CPU,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            label: "CPU Load (%)",
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Crashes',
        key: FilterKey.CRASHES,
        cardType: PERFORMANCE,
        metricOf: FilterKey.CRASHES,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Framerate',
        key: FilterKey.FPS,
        cardType: PERFORMANCE,
        metricOf: FilterKey.FPS,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            label: "Frames Per Second",
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'DOM Building Time',
        key: FilterKey.PAGES_DOM_BUILD_TIME,
        cardType: PERFORMANCE,
        metricOf: FilterKey.PAGES_DOM_BUILD_TIME,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            label: "DOM Build Time (ms)",
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Memory Consumption',
        key: FilterKey.MEMORY_CONSUMPTION,
        cardType: PERFORMANCE,
        metricOf: FilterKey.MEMORY_CONSUMPTION,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            label: "JS Heap Size (MB)",
            unit: 'mb',
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Page Response Time',
        key: FilterKey.PAGES_RESPONSE_TIME,
        cardType: PERFORMANCE,
        metricOf: FilterKey.PAGES_RESPONSE_TIME,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            label: "Page Response Time (ms)",
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Page Response Time Distribution',
        key: FilterKey.PAGES_RESPONSE_TIME_DISTRIBUTION,
        cardType: PERFORMANCE,
        metricOf: FilterKey.PAGES_RESPONSE_TIME_DISTRIBUTION,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            label: "Number of Calls",
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Resources vs Visually Completed',
        key: FilterKey.RESOURCES_VS_VISUALLY_COMPLETE,
        cardType: PERFORMANCE,
        metricOf: FilterKey.RESOURCES_VS_VISUALLY_COMPLETE,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateBarChartDate(),
            namesMap: [
                "Series 1"
            ]
        },
        example: BarChartCard,
    },

    {
        title: 'Sessions by Browser & Version',
        key: FilterKey.SESSIONS_PER_BROWSER,
        cardType: PERFORMANCE,
        metricOf: FilterKey.SESSIONS_PER_BROWSER,
        category: CARD_CATEGORIES[1].key,
        data: generateRandomBarsData(),
        example: SessionsPerBrowserExample,
    },

    {
        title: 'Slowest Domains',
        key: FilterKey.SLOWEST_DOMAINS,
        cardType: PERFORMANCE,
        metricOf: FilterKey.SLOWEST_DOMAINS,
        category: CARD_CATEGORIES[1].key,
        // data: generateRandomBarsData(),
        example: SlowestDomains,
    },

    {
        title: 'Speed Index by Location',
        key: FilterKey.SPEED_LOCATION,
        cardType: PERFORMANCE,
        metricOf: FilterKey.SPEED_LOCATION,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Time to Render',
        key: FilterKey.TIME_TO_RENDER,
        cardType: PERFORMANCE,
        metricOf: FilterKey.TIME_TO_RENDER,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },

    {
        title: 'Sessions Impacted by Slow Pages',
        key: FilterKey.IMPACTED_SESSIONS_BY_SLOW_PAGES,
        cardType: PERFORMANCE,
        metricOf: FilterKey.IMPACTED_SESSIONS_BY_SLOW_PAGES,
        category: CARD_CATEGORIES[1].key,
        data: {
            chart: generateAreaData(),
            namesMap: [
                "Series 1"
            ]
        },
        example: AreaChartCard,
    },


    // Web analytics
    {
        title: 'Sessions by Users',
        key: FilterKey.USERID,
        cardType: TABLE,
        metricOf: FilterKey.USERID,
        category: CARD_CATEGORIES[2].key,
        example: ByUser,
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
        cardType: ERRORS,
        metricOf: FilterKey.IMPACTED_SESSIONS_BY_JS_ERRORS,
        category: CARD_CATEGORIES[3].key,
        data: {
            chart: generateBarChartDate(),
        },
        example: BarChartCard,
    },
    {
        title: 'Errors by Origin',
        key: FilterKey.RESOURCES_BY_PARTY,
        cardType: ERRORS,
        metricOf: FilterKey.RESOURCES_BY_PARTY,
        category: CARD_CATEGORIES[3].key,
        data: {
            chart: generateBarChartDate(),
        },
        example: BarChartCard,
    },
    {
        title: 'Errors by Domain',
        key: FilterKey.ERRORS_PER_DOMAINS,
        cardType: ERRORS,
        metricOf: FilterKey.ERRORS_PER_DOMAINS,
        category: CARD_CATEGORIES[3].key,
        example: Bars,
        data: generateRandomBarsData(),
    },
    {
        title: 'Errors by Type',
        key: FilterKey.ERRORS_PER_TYPE,
        cardType: ERRORS,
        metricOf: FilterKey.ERRORS_PER_TYPE,
        category: CARD_CATEGORIES[3].key,
        data: {
            chart: generateBarChartDate(),
        },
        example: BarChartCard,
    },
    {
        title: 'Calls with Errors',
        key: FilterKey.CALLS_ERRORS,
        cardType: ERRORS,
        metricOf: FilterKey.CALLS_ERRORS,
        category: CARD_CATEGORIES[3].key,
        width: 4,
        data: {
            chart: [
                {
                    "method": "GET",
                    "urlHostpath": 'https://openreplay.com',
                    "allRequests": 1333,
                    "4xx": 1333,
                    "5xx": 0
                },
                {
                    "method": "POST",
                    "urlHostpath": 'https://company.domain.com',
                    "allRequests": 10,
                    "4xx": 10,
                    "5xx": 0
                },
                {
                    "method": "PUT",
                    "urlHostpath": 'https://example.com',
                    "allRequests": 3,
                    "4xx": 3,
                    "5xx": 0
                }
            ],
        },
        example: CallsWithErrorsExample,
    },

    {
        title: '4xx Domains',
        key: FilterKey.DOMAINS_ERRORS_4XX,
        cardType: ERRORS,
        metricOf: FilterKey.DOMAINS_ERRORS_4XX,
        category: CARD_CATEGORIES[3].key,
        data: {
            chart: generateTimeSeriesData(),
            label: "Number of Errors",
            namesMap: [
                "Series 1"
            ]
        },
        example: ExampleTrend,
    },

    {
        title: '5xx Domains',
        key: FilterKey.DOMAINS_ERRORS_5XX,
        cardType: ERRORS,
        metricOf: FilterKey.DOMAINS_ERRORS_5XX,
        category: CARD_CATEGORIES[3].key,
        data: {
            chart: generateTimeSeriesData(),
            label: "Number of Errors",
            namesMap: [
                "Series 1"
            ]
        },
        example: ExampleTrend,
    },


    // Web vitals
    {
        title: 'Avg. CPU Load',
        key: FilterKey.AVG_CPU,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_CPU,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },
    {
        title: 'Avg. DOM Content Load Time',
        key: FilterKey.AVG_DOM_CONTENT_LOADED,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_DOM_CONTENT_LOADED,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'DOM Content Loaded Start',
        key: FilterKey.AVG_DOM_CONTENT_LOAD_START,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_DOM_CONTENT_LOAD_START,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Avg. First Meaningful Paint Time',
        key: FilterKey.AVG_FIRST_CONTENTFUL_PIXEL,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_FIRST_CONTENTFUL_PIXEL,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Avg. First Paint Time',
        key: FilterKey.AVG_FIRST_PAINT,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_FIRST_PAINT,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Avg. Frame Rate',
        key: FilterKey.AVG_FPS,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_FPS,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Avg. Load Time of Images',
        key: FilterKey.AVG_IMAGE_LOAD_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_IMAGE_LOAD_TIME,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Avg. Load Time of Pages',
        key: FilterKey.AVG_PAGE_LOAD_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_PAGE_LOAD_TIME,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Avg. DOM Build Time',
        key: FilterKey.AVG_PAGES_DOM_BUILD_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_PAGES_DOM_BUILD_TIME,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Page Response Time',
        key: FilterKey.AVG_PAGES_RESPONSE_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_PAGES_RESPONSE_TIME,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Request Load Time',
        key: FilterKey.AVG_REQUEST_LOADT_IME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_REQUEST_LOADT_IME,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },
    {
        title: 'Response Time',
        key: FilterKey.AVG_RESPONSE_TIME,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_RESPONSE_TIME,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Session Duration',
        key: FilterKey.AVG_SESSION_DURATION,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_SESSION_DURATION,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Time Till First Byte',
        key: FilterKey.AVG_TILL_FIRST_BYTE,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_TILL_FIRST_BYTE,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Time to be Interactive',
        key: FilterKey.AVG_TIME_TO_INTERACTIVE,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_TIME_TO_INTERACTIVE,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'Time to Render',
        key: FilterKey.AVG_TIME_TO_RENDER,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_TIME_TO_RENDER,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },

    {
        title: 'JS Heap Size',
        key: FilterKey.AVG_USED_JS_HEAP_SIZE,
        cardType: WEB_VITALS,
        metricOf: FilterKey.AVG_USED_JS_HEAP_SIZE,
        category: CARD_CATEGORIES[4].key,
        data: generateWebVitalData(),
        example: WebVital,
    },
]


function generateRandomBarsData(): { total: number, values: { label: string, value: number }[] } {
    const labels = ["company.domain.com", "openreplay.com"];
    const values = labels.map(label => ({
        label,
        value: Math.floor(Math.random() * 100)
    }));
    const total = values.reduce((acc, curr) => acc + curr.value, 0);

    return {
        total,
        values: values.sort((a, b) => b.value - a.value)
    };
}


function generateWebVitalData(): { value: number, chart: { timestamp: number, value: number }[], unit: string } {
    const chart = Array.from({length: 7}, (_, i) => ({
        timestamp: Date.now() + i * 86400000,
        value: parseFloat((Math.random() * 10).toFixed(15))
    }));

    const value = chart.reduce((acc, curr) => acc + curr.value, 0) / chart.length;

    return {
        value,
        chart,
        unit: "%"
    };
}


function generateTimeSeriesData(): any[] {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const pointsPerMonth = 3; // Number of points for each month

    const data = months.flatMap((month, monthIndex) =>
        Array.from({length: pointsPerMonth}, (_, pointIndex) => ({
            time: month,
            "Series 1": Math.floor(Math.random() * 90),
            timestamp: Date.now() + (monthIndex * pointsPerMonth + pointIndex) * 86400000
        }))
    );

    return data;
}

function generateAreaData(): any[] {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const pointsPerMonth = 3; // Number of points for each month

    const data = months.flatMap((month, monthIndex) =>
        Array.from({length: pointsPerMonth}, (_, pointIndex) => ({
            time: month,
            "value": Math.floor(Math.random() * 90),
            timestamp: Date.now() + (monthIndex * pointsPerMonth + pointIndex) * 86400000
        }))
    );

    return data;
}

function generateRandomValue(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBarChartDate(): any[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    return months.map(month => ({
        time: month,
        value: generateRandomValue(1000, 5000),
    }));
}

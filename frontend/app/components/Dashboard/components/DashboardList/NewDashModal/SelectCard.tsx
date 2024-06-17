import React, {useMemo} from 'react';
import {Segmented} from 'antd';
import Option from './Option';
// import ProductAnalytics from './Examples/ProductAnalytics';
// import PerformanceMonitoring from './Examples/PerformanceMonitoring';
// import WebAnalytics from './Examples/WebAnalytics';
// import CoreWebVitals from './Examples/CoreWebVitals';
import {TrendingUp, Activity, BarChart, TableCellsMerge} from "lucide-react";
import ExampleFunnel from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/Funnel";
import ExamplePath from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/Path";
import ExampleTrend from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/Trend";
import ExampleCount from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/Count";
import PerfBreakdown from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/PerfBreakdown";
import SlowestDomain from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SlowestDomain";
import SessionsByErrors from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsByErrors";
import SessionsByIssues from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsByIssues";
import ByBrowser from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByBrowser";
import BySystem from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/BySystem";
import ByCountry from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByCountry";
import ByUrl from "Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/ByUrl";
import {ERRORS, FUNNEL, TIMESERIES, USER_PATH} from "App/constants/card";

interface SelectCardProps {
    onClose: () => void;
    onCard: (card: any) => void;
}

const CARD_CATEGORY = {
    PRODUCT_ANALYTICS: 'product-analytics',
    PERFORMANCE_MONITORING: 'performance-monitoring',
    WEB_ANALYTICS: 'web-analytics',
    CORE_WEB_VITALS: 'core-web-vitals',
}

const segmentedOptions = [
    {label: 'Product Analytics', Icon: TrendingUp, value: CARD_CATEGORY.PRODUCT_ANALYTICS},
    {label: 'Performance Monitoring', Icon: Activity, value: CARD_CATEGORY.PERFORMANCE_MONITORING},
    {label: 'Web Analytics', Icon: BarChart, value: CARD_CATEGORY.WEB_ANALYTICS},
    {label: 'Core Web Vitals', Icon: TableCellsMerge, value: CARD_CATEGORY.CORE_WEB_VITALS},
];

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

const CARD_TYPE_MAP = {
    [TYPE.FUNNEL]: FUNNEL,
    [TYPE.PATH_FINDER]: USER_PATH,
    [TYPE.TREND]: TIMESERIES,
    [TYPE.SESSIONS_BY]: TIMESERIES,
    [TYPE.BREAKDOWN]: TIMESERIES,
    [TYPE.SLOWEST_DOMAIN]: TIMESERIES,
    [TYPE.SESSIONS_BY_ERRORS]: ERRORS,
    [TYPE.SESSIONS_BY_ISSUES]: TIMESERIES,
    [TYPE.SESSIONS_BY_BROWSER]: TIMESERIES,
    [TYPE.SESSIONS_BY_SYSTEM]: TIMESERIES,
    [TYPE.SESSIONS_BY_COUNTRY]: TIMESERIES,
    [TYPE.SESSIONS_BY_URL]: TIMESERIES,
}

export const CARD_LIST = [
    {
        title: 'Funnel',
        key: TYPE.FUNNEL,
        cardType: FUNNEL,
        category: CARD_CATEGORY.PRODUCT_ANALYTICS,
        example: ExampleFunnel,
    },
    {
        title: 'Path Finder',
        key: TYPE.PATH_FINDER,
        cardType: USER_PATH,
        category: CARD_CATEGORY.PRODUCT_ANALYTICS,
        example: ExamplePath,
    },
    {
        title: 'Trend',
        key: TYPE.TREND,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.PRODUCT_ANALYTICS,
        example: ExampleTrend,
    },
    {
        title: 'Sessions by',
        key: TYPE.SESSIONS_BY,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.PRODUCT_ANALYTICS,
        example: ExampleCount,
    },
    {
        title: 'Breakdown',
        key: TYPE.BREAKDOWN,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.PERFORMANCE_MONITORING,
        example: PerfBreakdown,
    },
    {
        title: 'Slowest Domain',
        key: TYPE.SLOWEST_DOMAIN,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.PERFORMANCE_MONITORING,
        example: SlowestDomain,
    },
    {
        title: 'Sessions by Errors',
        key: TYPE.SESSIONS_BY_ERRORS,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.PERFORMANCE_MONITORING,
        example: SessionsByErrors,
    },
    {
        title: 'Sessions by Issues',
        key: TYPE.SESSIONS_BY_ISSUES,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.PERFORMANCE_MONITORING,
        example: SessionsByIssues,
    },

    {
        title: 'Sessions by Browser',
        key: TYPE.SESSIONS_BY_BROWSER,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.WEB_ANALYTICS,
        example: ByBrowser,
    },
    {
        title: 'Sessions by System',
        key: TYPE.SESSIONS_BY_SYSTEM,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.WEB_ANALYTICS,
        example: BySystem,
    },
    {
        title: 'Sessions by Country',
        key: TYPE.SESSIONS_BY_COUNTRY,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.WEB_ANALYTICS,
        example: ByCountry,
    },
    {
        title: 'Sessions by URL',
        key: TYPE.SESSIONS_BY_URL,
        cardType: TIMESERIES,
        category: CARD_CATEGORY.WEB_ANALYTICS,
        example: ByUrl,
    },

    // {
    //     title: 'Breakdown',
    //     key: TYPE.BREAKDOWN,
    //     category: CARD_CATEGORY.CORE_WEB_VITALS,
    //     example: PerfBreakdown,
    // },
    // {
    //     title: 'Slowest Domain',
    //     key: TYPE.SLOWEST_DOMAIN,
    //     category: CARD_CATEGORY.CORE_WEB_VITALS,
    //     example: SlowestDomain,
    // },
    // {
    //     title: 'Sessions by Issues',
    //     key: TYPE.SESSIONS_BY_ISSUES,
    //     category: CARD_CATEGORY.CORE_WEB_VITALS,
    //     example: SessionsByIssues,
    // },
    // {
    //     title: 'Sessions by Errors',
    //     key: TYPE.SESSIONS_BY_ISSUES,
    //     category: CARD_CATEGORY.CORE_WEB_VITALS,
    //     example: SessionsByErrors,
    // },
]

const SelectCard: React.FC<SelectCardProps> = (props: SelectCardProps) => {
    const [selected, setSelected] = React.useState<string>('product-analytics');
    // const item = getSelectedItem(selected, onCard);

    const onCard = (card: string) => {
        const _card = CARD_LIST.find((c) => c.key === card);
        props.onCard(_card);
        // props.onClose();
    }


    const item = useMemo(() => {
        return CARD_LIST.filter((card) => card.category === selected).map((card) => (
            <div key={card.key}>
                <card.example onCard={onCard} type={card.key} title={card.title}/>
            </div>
        ));
    }, [selected]);

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="text-2xl leading-4 font-semibold">
                    Select your first card type to add to the dashboard
                </div>
            </div>
            <div>
                <Segmented
                    options={segmentedOptions.map(({label, Icon, value}) => ({
                        label: <Option key={value} label={label} Icon={Icon}/>,
                        value,
                    }))}
                    onChange={setSelected}
                />
            </div>
            <div className="w-full grid grid-cols-2 gap-4 overflow-scroll"
                 style={{maxHeight: 'calc(100vh - 210px)'}}>
                {item}
            </div>
        </>
    );
};

export default SelectCard;

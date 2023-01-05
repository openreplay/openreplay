import { Map, List } from 'immutable';
import Session from 'Types/session';
import { camelCased } from 'App/utils';

import { getChartFormatter } from './helper';
import ProcessedSessions from './processedSessions';
import DomBuildingTime from './domBuildingTime';
import MemoryConsumption from './memoryConsumption';
import ResponseTime from './responseTime';
import ErrorsByType from './errorsByType';
import OverviewWidget from './overviewWidget';
import TopDomains from './topDomains';
import SpeedLocation from './speedLocation';
import SessionsPerBrowser from './sessionsPerBrowser';
import ErrorsByOrigin from './errorsByOrigin';
import SlowestResources from './slowestResources';
import ResponseTimeDistribution from './responseTimeDistribution';
import SessionsImpactedBySlowRequests from './sessionsImpactedBySlowRequests';
import TimeToRender from './timeToRender';
import SessionsImpactedByJSErrors from './sessionsImpactedByJSErrors';
import ApplicationActivity from './applicationActivity';
import TopMetrics from './topMetrics';
import Errors from './errors';
import UserActivity from './userActivity';
import Performance from './performance';
import Crashes from './crashes';
import PageMetrics from './pageMetrics';
import SlowestDomains from './slowestDomains';
import ResourceLoadingTime from './resourceLoadingTime';

import Image from './image';
import Resource from './resource';
import Err from './err';
import MissingResource from './missingResource';

export const WIDGET_LIST = [{
		key: "sessions",
		name: "Processed Sessions",
		description: 'Number of recorded user sessions.',
		thumb: 'processed_sessions.png',
		dataWrapper: (ps, period) => ProcessedSessions(ps)
			.update("chart", getChartFormatter(period)),
	}, {
		key: "applicationActivity",
		name: "Application Activity",
		description: 'Average loading time of pages, images and browser requests.',
		thumb: 'application_activity.png',
		dataWrapper: ApplicationActivity,
	}, {
		key: "errors",
		name: "Exceptions",
		description: 'Number of errors and impacted user sessions.',
		thumb: 'errors.png',
		dataWrapper: (e, period) => Errors(e)
			.update("chart", getChartFormatter(period)),
	}, {
		key: "userActivity",
		name: "User Activity",
		description: 'The average user feedback score, average number of visited pages per session and average session duration.',
		thumb: 'user_activity.png',
		dataWrapper: UserActivity,
	}, {
		key: "pageMetrics",
		name: "Page Metrics",
		description: "Average speed metrics across all pages: First Meaningful Pain and DOM Content Loaded.",
		thumb: 'page_metrics.png',
		dataWrapper: PageMetrics,
	}, {
		key: "performance",
		name: "Performance",
		description: "Compare the average loading times of your web app's resources (pages, images and browser requests)",
		thumb: 'performance.png',
		dataWrapper: (p, period) => Performance(p)
			.update("chart", getChartFormatter(period)),
	}, {
		key: "slowestImages",
		name: "Slowest Images",
		description: 'List of images that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		dataWrapper: list => List(list).map(Image).sort((i1, i2) => {
      if (i1.sessions < 1000) return i2.sessions -i1.sessions;
      const sessionK1 = Math.trunc(i1.sessions/1000);
      const sessionK2 = Math.trunc(i2.sessions/1000);
      if (sessionK1 !== sessionK2) return sessionK2 - sessionK1;
      return i2.avgDuration - i1.avgDuration;
    }),
	},
	// {
	// 	key: "errorsTrend",
	// 	name: "Most Impactful Errors",
	// 	description: 'List of errors and exceptions, sorted by the number of impacted sessions.',
	// 	thumb: 'most_Impactful_errors.png',
	// 	dataWrapper: list => List(list).map(Err),
	// },
	{
		key: "sessionsFrustration",
		name: "Recent Frustrations",
		description: "List of recent sessions where users experienced some kind of frustrations, such as click rage.",
		thumb: 'recent_frustrations.png',
		dataWrapper: list => List(list).map(s => new Session(s)),
	},
	{
		key: "sessionsFeedback",
		name: "Recent Negative Feedback",
		description: "List of recent sessions where users reported an issue or a bad experience.",
		thumb: 'negative_feedback.png',
		dataWrapper: list => List(list).map(s => new Session(s)),
	},
	{
		key: "missingResources",
		name: "Missing Resources",
		description: "List of resources, such as images, that couldn't be loaded.",
		thumb: 'missing_resources.png',
		type: 'resources',
		dataWrapper: list => List(list).map(MissingResource),
	},
	// {
	// 	key: "sessionsPerformance",
	// 	name: "Recent Performance Issues",
	// 	description: "",
	// 	dataWrapper: list => List(list).map(Session),
	// }
	{
		key: "slowestResources",
		name: "Slowest Resources",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'resources',
		dataWrapper: list => List(list).map(SlowestResources)
	},
	{
		key: "overview",
		name: "Overview Metrics",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		dataWrapper: (p, period) => {
			return List(p)
				.map(item => OverviewWidget({ key: camelCased(item.key), ...item.data}))
				.map(widget => widget.update("chart", getChartFormatter(period)))
		}
		// dataWrapper: (p, period) => List(p)
		// 	.update("chart", getChartFormatter(period))
	},
	{
		key: "speedLocation",
		name: "Speed Index by Location",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: list => SpeedLocation(list)
	},
	{
		key: "slowestDomains",
		name: "Slowest Domains",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		// dataWrapper: list => List(list).sort((a, b) => a.avg >= b.avg).map(SlowestDomains)
		dataWrapper: list => SlowestDomains(list)
			.update("partition", (partition) => List(partition).sort((a, b) => b.avg - a.avg))
	},
	{
		key: "sessionsPerBrowser",
		name: "Sessions per Browser",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: list => SessionsPerBrowser(list)
			// .update("chart", (list) => List(list).sort((a, b) => a.count >= b.count))
	},
	{
		key: "resourcesLoadingTime",
		name: "Resource Fetch Time",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'resources',
		dataWrapper: (list, period) => DomBuildingTime(list)
			.update("chart", getChartFormatter(period))
	},
	{
		key: "timeToRender",
		name: "Time To Render",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => TimeToRender(p)
			.update("chart", getChartFormatter(period))
	},
	{
		key: "impactedSessionsBySlowPages",
		name: "Sessions Impacted by Slow Requests",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => SessionsImpactedBySlowRequests({ chart: p})
			.update("chart", getChartFormatter(period))
	},
	{
		key: "memoryConsumption",
		name: "Memory Consumption",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => MemoryConsumption(p)
		// .update("chart", list => list.map((i) => ({...i, avgUsedJsHeapSize: i.avgUsedJsHeapSize/1024/1024 })))
		.update("chart", getChartFormatter(period))
	},
	{
		key: "cpu",
		name: "CPU Load",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => MemoryConsumption(p)
			.update("chart", getChartFormatter(period)),
	},
	{
		key: "fps",
		name: "Framerate",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => MemoryConsumption(p)
			.update("chart", getChartFormatter(period)),
	},
	{
		key: "crashes",
		name: "Crashes",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (e, period) => Crashes(e)
			.update("chart", getChartFormatter(period))
	},
	{
		key: "resourceTypeVsResponseEnd",
		name: "Resource Loaded vs Response End",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'resources',
		dataWrapper: (p, period) => ErrorsByType({chart: p})
			.update("chart", getChartFormatter(period))
	},
	{
		key: "resourcesCountByType",
		name: "Breakdown of Loaded Resources",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'resources',
		dataWrapper: (p, period) => ErrorsByType({chart: p})
			.update("chart", getChartFormatter(period))
	},
	{
		key: "resourcesVsVisuallyComplete",
		name: "Resource Loaded vs Visually Complete",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => ErrorsByType({chart: p})
			.update("chart", getChartFormatter(period))
			// .update('chart', (data) => {
			// 	return data.map(i => ({...i, avgTimeToRender: i.avgTimeToRender / 100}));
			// })
	},
	{
		key: "pagesDomBuildtime",
		name: "DOM Build Time",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => DomBuildingTime(p)
			.update("chart", getChartFormatter(period))
	},
	{
		key: "pagesResponseTime",
		name: "Page Response Time",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => ResponseTime(p)
			.update("chart", getChartFormatter(period))
	},
	{
		key: "pagesResponseTimeDistribution",
		name: "Page Response Time Distribution",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'performance',
		dataWrapper: (p, period) => ResponseTimeDistribution(p)
			.update("chart", getChartFormatter(period))
			.update("extremeValues", list => list.map(i => ({...i, time: 'Extreme Values'})))
			.update("percentiles", list => list.map(i => ({ ...i, responseTime: Math.round(i.responseTime)})))
	},
	{
		key: "domainsErrors_4xx",
		name: "Top Domains with 4xx Fetch Errors",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'errors',
		dataWrapper: (p, period) => TopDomains({ chart: p})
			.update("chart", getChartFormatter(period))
			// .updateIn(["chart", "5xx"], getChartFormatter(period))
	},
	{
		key: "domainsErrors_5xx",
		name: "Top Domains with 5xx Fetch Errors",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'errors',
		dataWrapper: (p, period) => TopDomains({ chart: p})
			.update("chart", getChartFormatter(period))
			// .updateIn(["chart", "5xx"], getChartFormatter(period))
	},
	{
		key: "errorsPerDomains",
		name: "Errors per Domain",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'errors',
		// dataWrapper: list => List(list)
		dataWrapper: list => List(list).sort((a, b) => b.errorsCount - a.errorsCount).take(5)
	},
	{
		key: "callsErrors",
		name: "Fetch Calls with Errors",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'errors',
		dataWrapper: list => List(list).sort((a, b) => b.allRequests - a.allRequests)
	},
	{
		key: "errorsPerType",
		name: "Errors by Type",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'errors',
		dataWrapper: (p, period) => ErrorsByType({chart: p})
			.update("chart", getChartFormatter(period))
	},
	{
		key: "resourcesByParty",
		name: "Errors by Origin",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'errors',
		dataWrapper: (p, period) => ErrorsByOrigin({chart: p})
			.update("chart", getChartFormatter(period))
	},
	{
		key: "impactedSessionsByJsErrors",
		name: "Sessions Affected by JS Errors",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		type: 'errors',
		dataWrapper: (p, period) => SessionsImpactedByJSErrors(p)
			.update("chart", getChartFormatter(period))
	},
	{
		key: "busiestTimeOfDay",
		name: "Busiest Time of the Day",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		dataWrapper: list => List(list)
	},
	{
		key: "topMetrics",
		name: "Top Metrics",
		description: 'List of resources that are slowing down your website, sorted by the number of impacted sessions.',
		thumb: 'na.png',
		dataWrapper: TopMetrics
	},

	// Overview Widgets
	{
		key: 'countSessions',
		name: 'Captured Sessions',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
		subtext: 'New vs Returning',
		type: 'overview',
		tooltipLabel: "Count",
		dataWrapper: list => List(list)
	},
	{
		key: 'avgTimeToRender',
		name: 'Time To Render',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => TimeToRender(list)
  },
  {
		key: 'avgTimeToInteractive',
		name: 'Time To Interactive',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => List(list)
	},
	{
		key: 'avgPageLoadTime',
		name: 'Page Load Time',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => List(list)
	},
	{
		key: 'avgImageLoadTime',
		name: 'Image Load Time',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => List(list)
  },
  {
		key: 'avgRequestLoadTime',
		name: 'Request Load Time',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => List(list)
	},
	{
		key: 'avgDomContentLoadStart',
		name: 'DOM Content Loaded',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => List(list)
	},
	{
		key: 'avgPagesDomBuildtime',
		name: 'DOM Build Time',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: (list, period) => DomBuildingTime(list)
			.update("chart", getChartFormatter(period))
	},
  {
		key: 'avgSessionDuration',
		name: 'Session Duration',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'min',
		type: 'overview',
		dataWrapper: list => List(list)
	},
	{
		key: 'avgVisitedPages',
		name: 'No. of Visited Pages',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
		subtext: 'test',
		type: 'overview',
		dataWrapper: list => List(list)
  },
  {
		key: 'avgPagesResponseTime',
		name: 'Page Response Time',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => ResponseTime(list)
  },
  {
		key: 'avgTillFirstBit',
		name: 'Time Till First Byte',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => ResponseTime(list)
  },
  // {
	// 	key: 'avgResponseTime',
	// 	name: 'Response Time',
	// 	description: 'Lorem ipsum...',
	// 	thumb: 'na.png',
  //   subtext: 'test',
	// 	unit: 'ms',
	// 	type: 'overview',
	// 	dataWrapper: list => List(list)
  // },
  // {
	// 	key: 'requestsCount',
	// 	name: 'Request Count',
	// 	description: 'Lorem ipsum...',
	// 	thumb: 'na.png',
  //   subtext: 'test',
	// 	// unit: 'ms',
	// 	type: 'overview',
	// 	dataWrapper: list => List(list)
	// },
	{
		key: 'avgFirstContentfulPixel',
		name: 'First Meaningful Paint',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => List(list)
  },
  {
		key: 'avgFirstPaint',
		name: 'First Paint',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'ms',
		type: 'overview',
		dataWrapper: list => List(list)
  },
  {
		key: 'avgUsedJsHeapSize',
		name: 'Memory Consumption',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
    subtext: 'test',
		unit: 'mb',
		type: 'overview',
		dataWrapper: list => List(list)
	},
	{
		key: 'avgCpu',
		name: 'CPU Load',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
		subtext: 'test',
		type: 'overview',
		unit: '%',
		dataWrapper: list => List(list)
	},
  {
		key: 'avgFps',
		name: 'Framerate',
		description: 'Lorem ipsum...',
		thumb: 'na.png',
		subtext: 'test',
		type: 'overview',
		dataWrapper: list => List(list)
	},

];

export const WIDGET_KEYS = WIDGET_LIST.map(({ key }) => key);

const WIDGET_MAP = {};
WIDGET_LIST.forEach(w => { WIDGET_MAP[ w.key ] = w; });

const OVERVIEW_WIDGET_MAP = {};
WIDGET_LIST.filter(w => w.type === 'overview').forEach(w => { OVERVIEW_WIDGET_MAP[ w.key ] = w; });

export {
	WIDGET_MAP,
	OVERVIEW_WIDGET_MAP,
	ProcessedSessions,
	ApplicationActivity,
	Errors,
	UserActivity,
	Performance,
	PageMetrics,
	Image,
	Err,
	SlowestDomains,
	ResourceLoadingTime
};

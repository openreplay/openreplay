import { TFunction } from 'i18next';

const LIBRARY = 'library';
export const TIMESERIES = 'timeseries';
export const TABLE = 'table';
export const HEATMAP_CLICKS = 'heatmaps_session';
export const HEATMAP = 'heatMap';
export const FUNNEL = 'funnel';
export const ERRORS = 'errors';
export const USER_PATH = 'pathAnalysis';
export const RETENTION = 'retention';
export const INSIGHTS = 'insights'; // SaaS and EE
const PERFORMANCE = 'performance';
export const WEBVITALS = 'webVital';

export const CATEGORIES = {
  product_analytics: 'product_analytics',
  monitors: 'monitors',
  web_analytics: 'web_analytics',
};
export const TYPE_NAMES = (t: TFunction) =>
  ({
    [LIBRARY]: t('Library'),
    [TIMESERIES]: t('Trend'),
    [TABLE]: t('Table'),
    [HEATMAP]: t('Heatmap'),
    [FUNNEL]: t('Funnel'),
    [ERRORS]: t('Errors'),
    [USER_PATH]: t('Journeys'),
    [RETENTION]: t('Retention'),
    [INSIGHTS]: t('Insights'),
    [PERFORMANCE]: t('Performance'),
    [WEBVITALS]: t('Web Vitals'),
  }) as const;

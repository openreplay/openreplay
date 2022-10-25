import { useModal } from 'App/components/Modal';
import React from 'react';
import MetricsLibraryModal from '../MetricsLibraryModal';
import MetricTypeItem, { MetricType } from '../MetricTypeItem/MetricTypeItem';

const METRIC_TYPES: MetricType[] = [
  {
    title: 'Add From Library',
    icon: 'grid',
    description: 'Select a pre existing card from card library',
    slug: 'library',
  },
  {
    title: 'Timeseries',
    icon: 'graph-up',
    description: 'Trend of sessions count in over the time.',
    slug: 'timeseries',
  },
  {
    title: 'Table',
    icon: 'list-alt',
    description: 'See list of Users, Sessions, Errors, Issues, etc.,',
    slug: 'table',
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
  },
  {
    title: 'Performance Monitoring',
    icon: 'speedometer2',
    description: 'Retention graph of users / features over a period of time.',
    slug: 'performance',
  },
  {
    title: 'Resource Monitoring',
    icon: 'files',
    description: 'Find the adoption of your all features in your app.',
    slug: 'resource-monitoring',
  },
  {
    title: 'Web Vitals',
    icon: 'activity',
    description: 'Find the adoption of your all features in your app.',
    slug: 'web-vitals',
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

function MetricTypeList() {
  const { showModal } = useModal();
  const onClick = ({ slug }: MetricType) => {
    if (slug === 'library') {
      showModal(<MetricsLibraryModal />, { right: true, width: 700 });
    }
  };
  return (
    <>
      {METRIC_TYPES.map((metric: MetricType) => (
        <MetricTypeItem metric={metric} onClick={() => onClick(metric)} />
      ))}
    </>
  );
}

export default MetricTypeList;

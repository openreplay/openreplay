import { Tag } from 'antd';
import { TFunction } from 'i18next';
import React from 'react';

import { TestStatus } from './types';

export const getStatusTag = (status: TestStatus, t: TFunction) => {
  const config = {
    pending: { color: 'orange', label: t('Pending Review') },
    approved: { color: 'green', label: t('Approved') },
    paused: { color: 'default', label: t('Paused') },
  };

  const { color, label } = config[status];
  return <Tag color={color}>{label}</Tag>;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
};

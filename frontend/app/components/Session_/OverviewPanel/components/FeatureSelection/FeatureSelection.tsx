import { FilterStrip } from '@/ui/filters/FilterStrip';
import { TFunction } from 'i18next';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { signalService } from 'App/services';

const NETWORK = 'NETWORK';
const ERRORS = 'ERRORS';
const EVENTS = 'EVENTS';
const FRUSTRATIONS = 'FRUSTRATIONS';
const PERFORMANCE = 'PERFORMANCE';

export const HELP_MESSAGE: any = (t: TFunction) => ({
  NETWORK: t('Network requests with issues in this session'),
  EVENTS: t('Visualizes the events that takes place in the DOM'),
  ERRORS: t('Visualizes native errors like Type, URI, Syntax etc.'),
  PERFORMANCE: t(
    'Summary of this session’s memory, and CPU consumption on the timeline',
  ),
  FRUSTRATIONS: t('Indicates user frustrations in the session'),
});

interface Props {
  list: any[];
  updateList: any;
  sessionId: string;
  counts?: Record<string, number>;
}

const sortPriority = {
  [PERFORMANCE]: 1,
  [FRUSTRATIONS]: 2,
  [ERRORS]: 3,
  [NETWORK]: 4,
  [EVENTS]: 5,
};

function FeatureSelection(props: Props) {
  const { sessionId, counts } = props;
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    [PERFORMANCE]: t('Performance'),
    [FRUSTRATIONS]: t('Frustrations'),
    [ERRORS]: t('Errors'),
    [NETWORK]: t('Network'),
    [EVENTS]: t('Events'),
  };

  const toggle = (feat: string) => {
    const on = props.list.includes(feat);
    props.updateList(
      on
        ? props.list.filter((f) => f !== feat)
        : // @ts-ignore
          [...props.list, feat].sort(
            (a, b) => sortPriority[a] - sortPriority[b],
          ),
    );
    void signalService.send(
      { source: `xray_${feat.toLowerCase()}`, value: !on },
      sessionId,
    );
  };

  return (
    <FilterStrip
      label={t('Lanes')}
      selected={props.list}
      onSelect={toggle}
      items={[PERFORMANCE, FRUSTRATIONS, ERRORS, NETWORK, EVENTS].map((k) => ({
        key: k,
        label: labels[k],
        count: counts?.[k] || undefined,
      }))}
    />
  );
}

export default FeatureSelection;

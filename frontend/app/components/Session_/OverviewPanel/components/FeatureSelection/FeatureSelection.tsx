import React from 'react';
import { Popover, Checkbox, Button } from 'antd';
import { EyeInvisibleOutlined } from '@ant-design/icons';
import { Icon } from 'UI';
import Funnel from '@/types/funnel';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

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
}

const sortPriority = {
  [PERFORMANCE]: 1,
  [FRUSTRATIONS]: 2,
  [ERRORS]: 3,
  [NETWORK]: 4,
  [EVENTS]: 5,
};
const featLabels = (t: TFunction) => ({
  [PERFORMANCE]: t('Performance Overview'),
  [FRUSTRATIONS]: t('User Frustrations'),
  [ERRORS]: t('Session Errors'),
  [NETWORK]: t('Network Events'),
  [EVENTS]: t('Custom Events'),
});

function FeatureSelection(props: Props) {
  const features = [NETWORK, ERRORS, EVENTS, PERFORMANCE, FRUSTRATIONS];
  const { t } = useTranslation();

  const toggleFeatureInList = (feat: string) => {
    if (props.list.includes(feat)) {
      props.updateList(props.list.filter((f) => f !== feat));
    } else {
      // @ts-ignore
      props.updateList(
        [...props.list, feat].sort((a, b) => sortPriority[a] - sortPriority[b]),
      );
    }
  };
  const toggleAllFeatures = () => {
    if (props.list.length === features.length) {
      props.updateList([]);
    } else {
      props.updateList(features);
    }
  };
  return (
    <Popover
      trigger="click"
      content={
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => toggleAllFeatures()}
          >
            <Checkbox checked={props.list.length === features.length} />
            <div>{t('All Features')}</div>
          </div>
          {features.map((feat) => (
            <div
              key={feat}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => toggleFeatureInList(feat)}
            >
              <Checkbox checked={props.list.includes(feat)} />
              {/* @ts-ignore */}
              <div>{featLabels(t)[feat]}</div>
            </div>
          ))}
        </div>
      }
    >
      <Button
        color="primary"
        size="small"
        type="text"
        className="font-medium"
        icon={<EyeInvisibleOutlined size={12} />}
      >
        {t('Hide / Show')}
      </Button>
    </Popover>
  );
}

export default FeatureSelection;

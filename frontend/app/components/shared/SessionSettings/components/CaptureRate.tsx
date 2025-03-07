import React, { useEffect, useState } from 'react';
import { Conditions } from 'App/mstore/types/FeatureFlag';
import { Icon, Input, Loader } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { Switch, Drawer, Button, Tooltip } from 'antd';
import ConditionalRecordingSettings from 'Shared/SessionSettings/components/ConditionalRecordingSettings';
import { useTranslation } from 'react-i18next';

type Props = {
  projectId?: string;
  setShowCaptureRate: (show: boolean) => void;
  open: boolean;
  showCaptureRate: boolean;
  isMobile?: boolean;
};

function CaptureRate(props: Props) {
  const { t } = useTranslation();
  const [conditions, setConditions] = React.useState<Conditions[]>([]);
  const { projectId, isMobile } = props;
  const { settingsStore, userStore } = useStore();
  const isAdmin = userStore.account.admin || userStore.account.superAdmin;
  const { isEnterprise } = userStore;
  const [changed, setChanged] = useState(false);
  const {
    sessionSettings: {
      captureRate,
      changeCaptureRate,
      conditionalCapture,
      changeConditionalCapture,
      captureConditions,
    },
    loadingCaptureRate,
    updateCaptureConditions,
    fetchCaptureConditions,
  } = settingsStore;

  useEffect(() => {
    if (projectId) {
      void fetchCaptureConditions(projectId);
    }
  }, [projectId]);

  React.useEffect(() => {
    setConditions(
      captureConditions.map(
        (condition: any) => new Conditions(condition, true, isMobile),
      ),
    );
  }, [captureConditions]);

  const onCaptureRateChange = (input: string) => {
    setChanged(true);
    changeCaptureRate(input);
  };

  const toggleRate = () => {
    setChanged(true);
    const newValue = !conditionalCapture;
    changeConditionalCapture(newValue);
    if (newValue) {
      changeCaptureRate('100');
    }
  };

  const onUpdate = () => {
    updateCaptureConditions(projectId!, {
      rate: parseInt(captureRate, 10),
      conditionalCapture,
      conditions: isEnterprise
        ? conditions.map((c) => c.toCaptureCondition())
        : [],
    });
    setChanged(false);
  };

  const updateDisabled =
    !changed ||
    !isAdmin ||
    (isEnterprise && conditionalCapture && conditions.length === 0);
  return (
    <Drawer
      size="large"
      open={props.open}
      styles={{ content: { background: '#F6F6F6' } }}
      onClose={() => props.setShowCaptureRate(false)}
      title={
        <div className="flex items-center w-full gap-2">
          <span className="font-semibold">{t('Capture Rate')}</span>
          <div className="ml-auto" />
          <Button
            type="primary"
            ghost
            onClick={() => props.setShowCaptureRate(false)}
          >
            {t('Cancel')}
          </Button>
          <Button disabled={updateDisabled} type="primary" onClick={onUpdate}>
            {t('Update')}
          </Button>
        </div>
      }
      closable={false}
      destroyOnClose
    >
      <Loader loading={loadingCaptureRate || !projectId}>
        <Tooltip title={isAdmin ? '' : "You don't have permission to change."}>
          <div className="my-2 flex items-center gap-2 h-8">
            <div className="font-semibold">
              {t('The percentage of session you want to capture')}
            </div>
            <Tooltip
              title={
                t(
                  'Define the percentage of user sessions to be recorded for detailed replay and analysis.',
                ) + ' ' +
                t(
                  'Sessions exceeding this specified limit will not be captured or stored.',
                )
              }
            >
              <Icon size={16} color="black" name="info-circle" />
            </Tooltip>
            <Switch
              checked={conditionalCapture}
              onChange={toggleRate}
              checkedChildren={!isEnterprise ? '100%' : t('Conditional')}
              disabled={!isAdmin}
              unCheckedChildren={!isEnterprise ? 'Custom' : t('Capture Rate')}
            />
            {!conditionalCapture ? (
              <div className={cn('relative', { disabled: !isAdmin })}>
                <Input
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (/^\d+$/.test(e.target.value) || e.target.value === '') {
                      onCaptureRateChange(e.target.value);
                    }
                  }}
                  value={captureRate.toString()}
                  style={{ height: '38px', width: '70px' }}
                  disabled={conditionalCapture}
                  min={0}
                  max={100}
                />
                <Icon
                  className="absolute right-0 mr-2 top-0 bottom-0 m-auto"
                  name="percent"
                  color="gray-medium"
                  size="18"
                />
              </div>
            ) : null}
          </div>
          {conditionalCapture && isEnterprise ? (
            <ConditionalRecordingSettings
              setChanged={setChanged}
              conditions={conditions}
              setConditions={setConditions}
              isMobile={isMobile}
            />
          ) : null}
        </Tooltip>
      </Loader>
    </Drawer>
  );
}

export default observer(CaptureRate);

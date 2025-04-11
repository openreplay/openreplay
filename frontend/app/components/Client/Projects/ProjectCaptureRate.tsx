import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Switch, Tooltip, Input, Typography } from 'antd';
import { Icon, Loader } from 'UI';
import cn from 'classnames';
import ConditionalRecordingSettings from 'Shared/SessionSettings/components/ConditionalRecordingSettings';
import { Conditions } from '@/mstore/types/FeatureFlag';
import { useStore } from '@/mstore';
import Project from '@/mstore/types/project';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

interface Props {
  project: Project;
}

function ProjectCaptureRate(props: Props) {
  const { t } = useTranslation();
  const [conditions, setConditions] = React.useState<Conditions[]>([]);
  const { projectId, platform } = props.project;
  const isMobile = platform !== 'web';
  const { settingsStore, userStore, customFieldStore } = useStore();
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
      setChanged(false);
      const fetchData = async () => {
        if (isEnterprise) {
          await customFieldStore.fetchListActive(`${projectId}`);
        }
        void fetchCaptureConditions(projectId);
      };
      void fetchData();
    }
  }, [projectId]);

  useEffect(() => {
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
    <Loader loading={loadingCaptureRate || !projectId}>
      <Tooltip title={isAdmin ? '' : t("You don't have permission to change.")}>
        <div className="flex flex-col gap-4 border-b pb-4">
          <Space>
            <Typography.Text>
              {t('Define percentage of sessions you want to capture')}
            </Typography.Text>
            <Tooltip
              title={
                t(
                  'Define the percentage of user sessions to be recorded for detailed replay and analysis.',
                ) +
                `\n${t('Sessions exceeding this specified limit will not be captured or stored.')}`
              }
            >
              <Icon size={16} color="black" name="info-circle" />
            </Tooltip>
          </Space>

          <Space className="flex items-center gap-6 h-6">
            <Switch
              checked={conditionalCapture}
              onChange={toggleRate}
              checkedChildren={!isEnterprise ? '100%' : t('Conditional')}
              disabled={!isAdmin}
              unCheckedChildren={
                !isEnterprise ? t('Custom') : t('Capture Rate')
              }
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
                  style={{ height: '26px', width: '70px' }}
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

            <Button
              type="primary"
              size="small"
              onClick={onUpdate}
              disabled={updateDisabled}
            >
              {t('Update')}
            </Button>
          </Space>
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
  );
}

export default observer(ProjectCaptureRate);

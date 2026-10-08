import { useStore } from '@/mstore';
import { Conditions } from '@/mstore/types/FeatureFlag';
import Project from '@/mstore/types/project';
import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { NumberInput } from '@/ui/inputs/number-input';
import { Tooltip } from '@/ui/overlays/tooltip';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConditionalRecordingSettings from 'Shared/SessionSettings/components/ConditionalRecordingSettings';

import { PrefBlock, PrefField, PrefToggle } from '../PrefSection';

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
    if (captureConditions) {
      setConditions(
        captureConditions.map(
          (condition: any) => new Conditions(condition, true, isMobile),
        ),
      );
    }
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
    void updateCaptureConditions(projectId!, {
      rate: parseInt(captureRate, 10),
      conditionalCapture,
      conditions: isEnterprise
        ? conditions.map((c) => c.toCaptureCondition())
        : [],
    }).then((saved) => saved && setChanged(false));
  };

  const updateDisabled =
    !changed ||
    // the form still shows another project's values until this one's load
    settingsStore.captureConditionsFor !== projectId ||
    !isAdmin ||
    (isEnterprise && conditionalCapture && conditions.length === 0);

  return (
    <Loader loading={loadingCaptureRate || !projectId}>
      <PrefBlock
        title={t('Capture rate')}
        hint={t(
          'Define the percentage of sessions you want to capture. Sessions beyond it are never recorded or stored.',
        )}
      >
        <PrefField
          label={isEnterprise ? t('Conditional') : t('Capture every session')}
          note={
            isEnterprise
              ? t(
                  'Record only the sessions that match a condition set below. Each set keeps its own rate.',
                )
              : undefined
          }
        >
          <PrefToggle
            checked={conditionalCapture}
            onChange={toggleRate}
            disabled={!isAdmin}
            label={conditionalCapture ? t('On') : t('Off')}
          />
        </PrefField>
        {!conditionalCapture ? (
          <PrefField>
            <div className="m-pref__row">
              <NumberInput
                value={captureRate === '' ? undefined : Number(captureRate)}
                min={0}
                max={100}
                disabled={!isAdmin}
                aria-label={t('Capture rate')}
                className="m-pref__w-xs"
                onChange={(v) =>
                  onCaptureRateChange(
                    v == null ? '' : String(Math.min(100, Math.max(0, v))),
                  )
                }
              />
              <span className="m-pref__hint">{t('% of sessions')}</span>
            </div>
          </PrefField>
        ) : null}
        <div className="m-pref__row">
          <Tooltip
            title={
              isAdmin ? undefined : t("You don't have permission to change.")
            }
          >
            <span>
              <Button
                variant="primary"
                onClick={onUpdate}
                disabled={updateDisabled}
              >
                {t('Update')}
              </Button>
            </span>
          </Tooltip>
        </div>
      </PrefBlock>
      {conditionalCapture && isEnterprise ? (
        <PrefBlock
          title={t('Condition sets')}
          hint={t('A session is recorded when it matches one of these.')}
        >
          <ConditionalRecordingSettings
            setChanged={setChanged}
            conditions={conditions}
            setConditions={setConditions}
            isMobile={isMobile}
          />
        </PrefBlock>
      ) : null}
    </Loader>
  );
}

export default observer(ProjectCaptureRate);

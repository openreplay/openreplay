import { useStore } from '@/mstore';
import { Conditions } from '@/mstore/types/FeatureFlag';
import Project from '@/mstore/types/project';
import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { NumberInput } from '@/ui/inputs/number-input';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FilterProjectContext } from 'Shared/FilterEditor';
import ConditionalRecordingSettings from 'Shared/SessionSettings/components/ConditionalRecordingSettings';

import { PrefBlock, PrefField, PrefToggle } from '../PrefSection';
import {
  type CaptureSettings,
  useCaptureSettings,
  useProjectFilters,
  useSaveCaptureSettings,
} from './queries';

interface Props {
  project: Project;
}

function ProjectCaptureRate({ project }: Props) {
  const { t } = useTranslation();
  const projectId = project.projectId!;
  const { userStore } = useStore();
  const { data, isError, dataUpdatedAt } = useCaptureSettings(projectId);
  const catalogue = useProjectFilters(`${projectId}`, userStore.isEnterprise);
  // owned here: the form remounts once a save lands, the mutation must not
  const save = useSaveCaptureSettings(projectId);

  if (isError && !data)
    return (
      <PrefBlock
        title={t('Capture rate')}
        hint={t('Could not load capture settings')}
      />
    );
  return (
    <Loader loading={!data || catalogue.isLoading}>
      {data ? (
        // remounts on fresh server data, so the form never edits stale values
        <CaptureRateForm
          key={`${projectId}:${dataUpdatedAt}`}
          project={project}
          saved={data}
          save={save}
        />
      ) : null}
    </Loader>
  );
}

interface FormProps {
  project: Project;
  saved: CaptureSettings;
  save: ReturnType<typeof useSaveCaptureSettings>;
}

const CaptureRateForm = observer(({ project, saved, save }: FormProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { userStore } = useStore();
  const isAdmin = userStore.account.admin || userStore.account.superAdmin;
  const { isEnterprise } = userStore;
  const isMobile = project.platform !== 'web';
  const siteId = `${project.projectId}`;
  const [captureRate, setCaptureRate] = useState(saved.rate);
  const [conditionalCapture, setConditionalCapture] = useState(
    saved.conditionalCapture,
  );
  const [conditions, setConditions] = useState<Conditions[]>(() =>
    saved.conditions.map((c) => new Conditions(c, true, isMobile, siteId)),
  );
  const [changed, setChanged] = useState(false);

  const toggleRate = () => {
    setChanged(true);
    const newValue = !conditionalCapture;
    setConditionalCapture(newValue);
    if (newValue) {
      setCaptureRate(100);
    }
  };

  const onUpdate = () => {
    const names = conditions.map((c) => c.name);
    if (new Set(names).size !== names.length) {
      toast.error(t('Condition set names must be unique'));
      return;
    }
    save.mutate(
      {
        rate: captureRate,
        conditionalCapture,
        conditions: isEnterprise
          ? conditions.map((c) => c.toCaptureCondition())
          : [],
      },
      {
        onSuccess: () => toast.success(t('Settings updated successfully')),
        onError: () => toast.error(t('Error saving capture rate')),
      },
    );
  };

  const updateDisabled =
    !changed ||
    save.isPending ||
    !isAdmin ||
    (isEnterprise && conditionalCapture && conditions.length === 0);

  return (
    <>
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
                value={captureRate}
                min={0}
                max={100}
                disabled={!isAdmin}
                aria-label={t('Capture rate')}
                className="m-pref__w-xs"
                onChange={(v) => {
                  setChanged(true);
                  setCaptureRate(v == null ? 0 : Math.min(100, Math.max(0, v)));
                }}
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
          <FilterProjectContext.Provider value={siteId}>
            <ConditionalRecordingSettings
              setChanged={setChanged}
              conditions={conditions}
              setConditions={setConditions}
              isMobile={isMobile}
            />
          </FilterProjectContext.Provider>
        </PrefBlock>
      ) : null}
    </>
  );
});

export default observer(ProjectCaptureRate);

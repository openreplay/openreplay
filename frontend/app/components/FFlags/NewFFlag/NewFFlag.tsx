/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Input, SegmentSelection, Loader, NoContent } from 'UI';
import Breadcrumb from 'Shared/Breadcrumb';
import { Button, Switch } from 'antd';
import { useModal } from 'App/components/Modal';
import HowTo from 'Components/FFlags/NewFFlag/HowTo';
import { Prompt, useHistory } from 'react-router';
import { withSiteId, fflags, fflagRead } from 'App/routes';
import RolloutCondition from 'Shared/ConditionSet';
import { toast } from 'react-toastify';
import { nonFlagFilters } from 'Types/filter/newFilter';
import Description from './Description';
import Header from './Header';
import Multivariant from './Multivariant';
import { Payload } from './Helpers';
import { useTranslation } from 'react-i18next';

function NewFFlag({ siteId, fflagId }: { siteId: string; fflagId?: string }) {
  const { t } = useTranslation();
  const { featureFlagsStore } = useStore();

  React.useEffect(() => {
    if (fflagId) {
      void featureFlagsStore.fetchFlag(parseInt(fflagId, 10));
    } else {
      featureFlagsStore.initNewFlag();
    }
    return () => {
      featureFlagsStore.setCurrentFlag(null);
    };
  }, [fflagId]);

  const current = featureFlagsStore.currentFflag;
  const { showModal } = useModal();
  const history = useHistory();

  if (featureFlagsStore.isLoading) return <Loader loading />;
  if (!current) {
    return (
      <div className="w-full mx-auto mb-4" style={{ maxWidth: '1360px' }}>
        <Breadcrumb
          items={[
            { label: 'Feature Flags', to: withSiteId(fflags(), siteId) },
            { label: fflagId },
          ]}
        />
        <NoContent show title={t('Feature flag not found')} />
      </div>
    );
  }

  const onImplementClick = () => {
    showModal(<HowTo />, { right: true, width: 450 });
  };

  const onCancel = () => {
    history.goBack();
  };

  const onSave = () => {
    const possibleError = featureFlagsStore.checkFlagForm();
    if (possibleError) return toast.error(possibleError);
    if (fflagId) {
      featureFlagsStore
        .updateFlag()
        .then(() => {
          toast.success(t('Feature flag updated.'));
          history.push(withSiteId(fflagRead(fflagId), siteId));
        })
        .catch(() => {
          toast.error(
            t('Failed to update flag, check your data and try again.'),
          );
        });
    } else {
      featureFlagsStore
        .createFlag()
        .then(() => {
          toast.success(t('Feature flag created.'));
          history.push(withSiteId(fflags(), siteId));
        })
        .catch(() => {
          toast.error(t('Failed to create flag.'));
        });
    }
  };

  const showDescription = Boolean(current.description?.length);
  return (
    <div className="w-full mx-auto mb-4" style={{ maxWidth: '1360px' }}>
      <Prompt
        when={current.hasChanged}
        message={() =>
          t('You have unsaved changes. Are you sure you want to leave?')
        }
      />
      <Breadcrumb
        items={[
          { label: t('Feature Flags'), to: withSiteId(fflags(), siteId) },
          { label: fflagId ? current.flagKey : t('New Feature Flag') },
        ]}
      />
      <div className="w-full bg-white rounded p-4 widget-wrapper">
        <div className="flex justify-between items-center">
          <Header
            siteId={siteId}
            current={current}
            onCancel={onCancel}
            onSave={onSave}
            isNew={!fflagId}
          />
        </div>
        <div className="w-full border-b border-light-gray my-2" />

        <label className="font-semibold">{t('Key')}</label>
        <Input
          type="text"
          placeholder="new-unique-key"
          value={current.flagKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value?.length > 60) return;
            current.setFlagKey(e.target.value.replace(/\s/g, '-'));
          }}
        />
        <div className="text-sm text-disabled-text mt-1 flex items-center gap-1">
          {t('Feature flag keys must be unique.')}
          <div className="link" onClick={onImplementClick}>
            {t('Learn how to implement feature flags')}
          </div>
          {t('in your code.')}
        </div>

        <div className="mt-6">
          <Description
            current={current}
            isDescrEditing={featureFlagsStore.isDescrEditing}
            setEditing={featureFlagsStore.setEditing}
            showDescription={showDescription}
          />
        </div>

        <div className="mt-6">
          <label className="font-semibold">{t('Feature Type')}</label>
          <div style={{ width: 340 }}>
            <SegmentSelection
              outline
              name="feature-type"
              size="small"
              onSelect={(_: any, { value }: any) => {
                current.setIsSingleOption(value === 'single');
              }}
              value={{ value: current.isSingleOption ? 'single' : 'multi' }}
              list={[
                { name: t('Single Variant (Boolean)'), value: 'single' },
                { name: t('Multi-Variant (String)'), value: 'multi' },
              ]}
            />
          </div>
          {current.isSingleOption ? (
            <>
              <div className="text-sm text-disabled-text mt-1 flex items-center gap-1">
                {t('Users will be served')}
                <code className="p-1 text-red rounded bg-gray-lightest">
                  {}
                  true
                </code>{' '}
                {t('if they match one or more rollout conditions.')}
              </div>
              <div className="mt-6">
                <Payload />
                <Input
                  value={current.payload ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    current.setPayload(e.target.value);
                  }}
                  placeholder={t("E.g. red button, {'buttonColor': 'red'}")}
                  className="mt-2"
                />
              </div>
            </>
          ) : (
            <Multivariant />
          )}
        </div>

        <div className="mt-6">
          <label className="font-semibold">
            {t('Persist flag across authentication')}
          </label>
          <div className="flex items-center gap-2">
            <Switch
              checked={current.isPersist}
              onChange={() => {
                current.setIsPersist(!current.isPersist);
              }}
            />
            <div>{current.isPersist ? t('Yes') : t('No')}</div>
          </div>
          <div className="text-sm text-disabled-text flex items-center gap-1">
            {t(
              'Persist flag to not reset this feature flag status after a user is identified.',
            )}
          </div>
        </div>

        <div className="mt-6">
          <label className="font-semibold">
            {t('Enable this feature flag (Status)?')}
          </label>
          <div className="flex items-center gap-2">
            <Switch
              checked={current.isActive}
              onChange={() => {
                !fflagId && !current.isActive
                  ? toast.success(
                      t('Feature flag will be enabled upon saving it.'),
                    )
                  : '';
                current.setIsEnabled(!current.isActive);
              }}
            />
            <div>{current.isActive ? t('Enabled') : t('Disabled')}</div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded bg-gray-lightest">
          <label className="font-semibold">{t('Rollout Conditions')}</label>
          {current.conditions.length === 0 ? null : (
            <div className="text-sm text-disabled-text mb-2">
              {t(
                'Indicate the users for whom you intend to make this flag available. Keep in mind that each set of conditions will be deployed separately from one another.',
              )}
            </div>
          )}
          <NoContent
            show={current.conditions.length === 0}
            title={t(
              'The flag will be available for 100% of the user sessions.',
            )}
            subtext={
              <div
                className="flex flex-col items-center"
                style={{ fontSize: 14 }}
              >
                <div className="text-sm mb-1">
                  {t('Set up condition sets to restrict the rollout.')}
                </div>
                <Button onClick={() => current!.addCondition()} type="text">
                  +&nbsp;{t('Create Condition Set')}
                </Button>
              </div>
            }
          >
            <>
              {current.conditions.map((condition, index) => (
                <React.Fragment key={index}>
                  <RolloutCondition
                    set={index + 1}
                    index={index}
                    conditions={condition}
                    bottomLine1={t('Rollout to')}
                    bottomLine2={t('of sessions')}
                    removeCondition={current.removeCondition}
                    excludeFilterKeys={nonFlagFilters}
                  />
                  <div className="my-2 w-full text-center">{t('OR')}</div>
                </React.Fragment>
              ))}
              {current.conditions.length <= 10 ? (
                <div
                  onClick={() => current!.addCondition()}
                  className="flex items-center justify-center w-full bg-white rounded border mt-2 p-2"
                >
                  <Button type="text">
                    +&nbsp;{t('Create Condition Set')}
                  </Button>
                </div>
              ) : null}
            </>
          </NoContent>
        </div>
      </div>
    </div>
  );
}

export default observer(NewFFlag);

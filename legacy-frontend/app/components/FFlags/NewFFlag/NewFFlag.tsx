import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Input, SegmentSelection, Toggler, Loader, Button, NoContent } from 'UI';
import Breadcrumb from 'Shared/Breadcrumb';
import { useModal } from 'App/components/Modal';
import HowTo from 'Components/FFlags/NewFFlag/HowTo';
import {Prompt, useHistory} from 'react-router';
import {withSiteId, fflags, fflagRead} from 'App/routes';
import Description from './Description';
import Header from './Header';
import RolloutCondition from 'Shared/ConditionSet';
import Multivariant from './Multivariant';
import { Payload } from './Helpers'
import { toast } from 'react-toastify';
import { nonFlagFilters } from 'Types/filter/newFilter';

function NewFFlag({ siteId, fflagId }: { siteId: string; fflagId?: string }) {
  const { featureFlagsStore } = useStore();

  React.useEffect(() => {
    if (fflagId) {
      void featureFlagsStore.fetchFlag(parseInt(fflagId, 10));
    } else {
      featureFlagsStore.initNewFlag();
    }
    return () => {
      featureFlagsStore.setCurrentFlag(null);
    }
  }, [fflagId]);

  const current = featureFlagsStore.currentFflag;
  const { showModal } = useModal();
  const history = useHistory();

  if (featureFlagsStore.isLoading) return <Loader loading={true} />;
  if (!current) return (
    <div className={'w-full mx-auto mb-4'} style={{ maxWidth: '1360px' }}>
      <Breadcrumb
        items={[
          { label: 'Feature Flags', to: withSiteId(fflags(), siteId) },
          { label: fflagId },
        ]}
      />
      <NoContent show title={'Feature flag not found'} />
    </div>
  )

  const onImplementClick = () => {
    showModal(<HowTo />, { right: true, width: 450 });
  };

  const onCancel = () => {
    history.goBack()
  };

  const onSave = () => {
    const possibleError = featureFlagsStore.checkFlagForm();
    if (possibleError) return toast.error(possibleError);
    if (fflagId) {
      featureFlagsStore.updateFlag().then(() => {
        toast.success('Feature flag updated.');
        history.push(withSiteId(fflagRead(fflagId), siteId));
      })
        .catch(() => {
          toast.error(`Failed to update flag, check your data and try again.`)
        })
    } else {
      featureFlagsStore.createFlag().then(() => {
        toast.success('Feature flag created.');
        history.push(withSiteId(fflags(), siteId));
      }).catch(() => {
        toast.error('Failed to create flag.');
      })
    }
  };

  const showDescription = Boolean(current.description?.length);
  return (
    <div className={'w-full mx-auto mb-4'} style={{ maxWidth: '1360px' }}>
      <Prompt
        when={current.hasChanged}
        message={() => {
          return 'You have unsaved changes. Are you sure you want to leave?';
        }}
      />
      <Breadcrumb
        items={[
          { label: 'Feature Flags', to: withSiteId(fflags(), siteId) },
          { label: fflagId ? current.flagKey : 'New Feature Flag' },
        ]}
      />
      <div className={'w-full bg-white rounded p-4 widget-wrapper'}>
        <div className="flex justify-between items-center">
          <Header siteId={siteId} current={current} onCancel={onCancel} onSave={onSave} isNew={!fflagId} />
        </div>
        <div className={'w-full border-b border-light-gray my-2'} />

        <label className={'font-semibold'}>Key</label>
        <Input
          type="text"
          placeholder={'new-unique-key'}
          value={current.flagKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value?.length > 60) return;
            current.setFlagKey(e.target.value.replace(/\s/g, '-'));
          }}
        />
        <div className={'text-sm text-disabled-text mt-1 flex items-center gap-1'}>
          Feature flag keys must be unique.
          <div className={'link'} onClick={onImplementClick}>
            Learn how to implement feature flags
          </div>
          in your code.
        </div>

        <div className={'mt-6'}>
          <Description
            current={current}
            isDescrEditing={featureFlagsStore.isDescrEditing}
            setEditing={featureFlagsStore.setEditing}
            showDescription={showDescription}
          />
        </div>

        <div className={'mt-6'}>
          <label className={'font-semibold'}>Feature Type</label>
          <div style={{ width: 340 }}>
            <SegmentSelection
              outline
              name={'feature-type'}
              size={'small'}
              onSelect={(_: any, { value }: any) => {
                current.setIsSingleOption(value === 'single');
              }}
              value={{ value: current.isSingleOption ? 'single' : 'multi' }}
              list={[
                { name: 'Single Variant (Boolean)', value: 'single' },
                { name: 'Multi-Variant (String)', value: 'multi' },
              ]}
            />
          </div>
          {current.isSingleOption ? (
            <>
              <div className={'text-sm text-disabled-text mt-1 flex items-center gap-1'}>
                Users will be served
                <code className={'p-1 text-red rounded bg-gray-lightest'}>true</code> if they match
                one or more rollout conditions.
              </div>
              <div className={'mt-6'}>
                <Payload />
                <Input
                  value={current.payload ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    current.setPayload(e.target.value);
                  }}
                  placeholder={"E.g. red button, {'buttonColor': 'red'}"}
                  className={'mt-2'}

                />
              </div>
            </>
          ) : (
            <Multivariant />
          )}
        </div>

        <div className={'mt-6'}>
          <label className={'font-semibold'}>Persist flag across authentication</label>
          <Toggler
            checked={current.isPersist}
            name={'persist-flag'}
            onChange={() => {
              current.setIsPersist(!current.isPersist);
            }}
            label={current.isPersist ? 'Yes' : 'No'}
          />
          <div className={'text-sm text-disabled-text flex items-center gap-1'}>
            Persist flag to not reset this feature flag status after a user is identified.
          </div>
        </div>

        <div className={'mt-6'}>
          <label className={'font-semibold'}>Enable this feature flag (Status)?</label>
          <Toggler
            checked={current.isActive}
            name={'persist-flag'}
            onChange={() => {
              !fflagId && !current.isActive ? toast.success("Feature flag will be enabled upon saving it.") : ""
              current.setIsEnabled(!current.isActive);
            }}
            label={current.isActive ? 'Enabled' : 'Disabled'}
          />
        </div>

        <div className={'mt-6 p-4 rounded bg-gray-lightest'}>
          <label className={'font-semibold'}>Rollout Conditions</label>
          {current.conditions.length === 0 ? null : (
            <div className={'text-sm text-disabled-text mb-2'}>
              Indicate the users for whom you intend to make this flag available. Keep in mind that
              each set of conditions will be deployed separately from one another.
            </div>
          )}
          <NoContent
            show={current.conditions.length === 0}
            title={'The flag will be available for 100% of the user sessions.'}
            subtext={
              <div className={'flex flex-col items-center'} style={{ fontSize: 14 }}>
                <div className={'text-sm mb-1'}>
                  Set up condition sets to restrict the rollout.
                </div>
                <Button onClick={() => current!.addCondition()} variant={'text-primary'}>
                  + Create Condition Set
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
                    bottomLine1={'Rollout to'}
                    bottomLine2={'of sessions'}
                    removeCondition={current.removeCondition}
                    excludeFilterKeys={nonFlagFilters}
                  />
                  <div className={'my-2 w-full text-center'}>OR</div>
                </React.Fragment>
              ))}
              {current.conditions.length <= 10 ? (
                <div
                  onClick={() => current!.addCondition()}
                  className={
                    'flex items-center justify-center w-full bg-white rounded border mt-2 p-2'
                  }
                >
                  <Button variant={'text-primary'}>+ Create Condition Set</Button>
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

import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Input, SegmentSelection, Toggler, Loader, Button, NoContent } from 'UI';
import Breadcrumb from 'Shared/Breadcrumb';
import { useModal } from 'App/components/Modal';
import HowTo from 'Components/FFlags/NewFFlag/HowTo';
import { useHistory } from 'react-router';
import { withSiteId, fflags } from 'App/routes';
import Description from './Description';
import Header from './Header';
import RolloutCondition from './Conditions';
import Multivariant from './Multivariant';

function NewFFlag({ siteId, fflagId }: { siteId: string; fflagId: string }) {
  const { featureFlagsStore } = useStore();

  React.useEffect(() => {
    if (fflagId) {
      void featureFlagsStore.fetchFlag(fflagId);
    } else {
      featureFlagsStore.initNewFlag();
    }
  }, [fflagId]);

  const current = featureFlagsStore.currentFflag;
  const { showModal } = useModal();
  const history = useHistory();

  if (!current) return <Loader loading={true} />;

  const onImplementClick = () => {
    showModal(<HowTo />, { right: true, width: 450 });
  };

  const onCancel = () => {
    featureFlagsStore.setCurrentFlag(null);
    history.push(withSiteId(fflags(), siteId));
  };

  const onSave = () => {
    if (fflagId) {
      void featureFlagsStore.updateFlag();
    } else {
      featureFlagsStore.createFlag().then(() => {
        history.push(withSiteId(fflags(), siteId));
      });
    }
  };

  const showDescription = Boolean(current.description.length);
  return (
    <div className={'w-full mx-auto mb-4'} style={{ maxWidth: 1300 }}>
      <Breadcrumb
        items={[
          { label: 'Feature Flags', to: withSiteId(fflags(), siteId) },
          { label: 'New Feature Flag' },
        ]}
      />
      <div className={'w-full bg-white rounded p-4 widget-wrapper'}>
        <div className="flex justify-between items-center">
          <Header
            current={current}
            onCancel={onCancel}
            onSave={onSave}
            setEditing={featureFlagsStore.setEditing}
            isTitleEditing={featureFlagsStore.isTitleEditing}
          />
        </div>
        <div className={'w-full border-b border-light-gray my-2'} />

        <label className={'font-semibold'}>Key</label>
        <Input
          type="text"
          placeholder={'new-unique-key'}
          value={current.flagKey}
          onChange={(e) => {
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

        <div className={'mt-4'}>
          <Description
            current={current}
            isDescrEditing={featureFlagsStore.isDescrEditing}
            setEditing={featureFlagsStore.setEditing}
            showDescription={showDescription}
          />
        </div>

        <div className={'mt-4'}>
          <label className={'font-semibold'}>Feature Type</label>
          <div style={{ width: 340 }}>
            <SegmentSelection
              outline
              name={'feature-type'}
              size={'small'}
              onSelect={(_: any, { value }: any) => {
                current.setIsSingleOption(Boolean(value));
              }}
              value={{ value: current.isSingleOption ? 1 : 0 }}
              list={[
                { name: 'Single Variant (Boolean)', value: 1 },
                { name: 'Multi-Variant (String)', value: 0 },
              ]}
            />
          </div>
          {current.isSingleOption ? (
            <div className={'text-sm text-disabled-text mt-1 flex items-center gap-1'}>
              Users will be served
              <code className={'p-1 text-red rounded bg-gray-lightest'}>true</code> if they match
              one or more rollout conditions.
            </div>
          ) : (
            <Multivariant />
          )}
        </div>

        <div className={'mt-4'}>
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

        <div className={'mt-4'}>
          <label className={'font-semibold'}>Enable this feature flag (Status)?</label>
          <Toggler
            checked={current.isActive}
            name={'persist-flag'}
            onChange={() => {
              current.setIsEnabled(!current.isActive);
            }}
            label={current.isActive ? 'Enabled' : 'Disabled'}
          />
        </div>

        <div className={'mt-4 p-4 rounded bg-gray-lightest'}>
          <label className={'font-semibold'}>Rollout Conditions</label>
          {current.conditions.length === 0 ? null
            : (
              <div className={'text-sm text-disabled-text'}>
                Indicate the users for whom you intend to make this flag available. Keep in mind that
                each set of conditions will be deployed separately from one another.
              </div>
            )
          }
          <NoContent
            show={current.conditions.length === 0}
            title={'100% of sessions will get this feature flag'}
            subtext={
              <div className={"flex flex-col items-center"}>
                <div className={'text-sm mb-1'}>
                  Indicate the users for whom you intend to make this flag available.
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
                    addCondition={current.addCondition}
                    removeCondition={current.removeCondition}
                  />
                  <div className={'my-2 w-full text-center'}>OR</div>
                </React.Fragment>
              ))}
              <div
                onClick={() => current!.addCondition()}
                className={
                  'flex items-center justify-center w-full bg-white rounded border mt-2 p-2'
                }
              >
                <Button variant={'text-primary'}>+ Create Condition Set</Button>
              </div>
            </>
          </NoContent>
        </div>
      </div>
    </div>
  );
}

export default observer(NewFFlag);

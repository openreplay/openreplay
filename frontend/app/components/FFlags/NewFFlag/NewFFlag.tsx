import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from "App/mstore";
import { PageTitle, Button, Input, SegmentSelection, Toggler, Loader, Icon } from 'UI'
import Breadcrumb from 'Shared/Breadcrumb';
import { useModal } from 'App/components/Modal';
import HowTo from "Components/FFlags/NewFFlag/HowTo";
import cn from 'classnames'
import { useHistory } from "react-router";
import { withSiteId, fflags } from "App/routes";

function NewFFlag({ siteId }: { siteId: string }) {
  const { featureFlagsStore } = useStore();
  const current = featureFlagsStore.currentFflag
  const { showModal } = useModal();
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const history = useHistory()

  React.useEffect(() => {
    featureFlagsStore.initNewFlag()
  }, [])

  const onImplementClick = () => {
    showModal(<HowTo />, { right: true, width: 450 })
  }

  const onCancel = () => {
    featureFlagsStore.setCurrentFlag(null)
    history.push(withSiteId(fflags(), siteId))
  }

  const onSave = () => {
    featureFlagsStore.addFlag(current!)
    history.push(withSiteId(fflags(), siteId))
  }

  if (!current) return <Loader loading={true} />;

  const showDescription = Boolean(current.description.length)
  return (
    <div className={'w-full mx-auto'} style={{ maxWidth: 1300 }}>
      <Breadcrumb
        items={[
          { label: 'Feature Flags', to: withSiteId(fflags(), siteId) },
          { label: 'New Feature Flag' },
        ]}
      />
      <div
        className={'w-full bg-white rounded p-4 widget-wrapper'}
      >
        <div className="flex justify-between items-center">
          {featureFlagsStore.isTitleEditing
            ? <input
              ref={inputRef}
              name="flag-description"
              placeholder="Title..."
              autoFocus
              className="rounded fluid border px-2 py-1 w-full"
              value={current.name}
              onChange={(e) => {
                if (current) current.setName(e.target.value)
              }}
              onBlur={() => featureFlagsStore.setEditing({ isTitleEditing: false })}
              onFocus={() => featureFlagsStore.setEditing({ isTitleEditing: true })}
            />
            :
              <div
                onClick={() => featureFlagsStore.setEditing({ isTitleEditing: true })}
                className={cn(
                  'cursor-pointer border-b w-fit flex items-center gap-2',
                  'border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium'
                )}
              >
                <PageTitle title={current.name} />
                <Icon name={'edit'} />
              </div>
          }

          <div className={'flex items-center gap-2'}>
            <Button variant="text-primary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
        <div className={'w-full border-b border-light-gray my-2'} />

        <label className={'font-semibold'}>Key</label>
        <Input
          type="text"
          placeholder={'E.g. new_payment_method'}
          value={current.key}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (current) {
              current.key = e.target.value
            }
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
          <label><span className={'font-semibold'}>Description </span> (Optional)</label>
          {featureFlagsStore.isDescrEditing
            ? <textarea
              ref={inputRef}
              name="flag-description"
              placeholder="Description..."
              rows={3}
              autoFocus
              className="rounded fluid border px-2 py-1 w-full"
              value={current.description}
              onChange={(e) => {
                if (current) current.setDescription(e.target.value)
              }}
              onBlur={() => featureFlagsStore.setEditing({ isDescrEditing: false })}
              onFocus={() => featureFlagsStore.setEditing({ isDescrEditing: true })}
            />
            : showDescription
              ? <div
                onClick={() => featureFlagsStore.setEditing({ isDescrEditing: true })}
                className={cn(
                  'cursor-pointer border-b w-fit',
                  'border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium'
                )}
              >
                {current.description}
              </div>
              : <Button
                variant={'text-primary'}
                icon={'edit'}
                onClick={() => featureFlagsStore.setEditing({ isDescrEditing: true })}
              >
                Add
              </Button>
          }
        </div>

        <div className={'mt-4'}>
          <label className={'font-semibold'}>Feature Type</label>
          <div style={{ width: 340 }}>
            <SegmentSelection
              outline
              name={'feature-type'}
              size={'small'}
              onSelect={(_: any, { value }: any) => {
                current.setIsSingleOption(Boolean(value))
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
              Users will be served <code className={'p-1 text-red rounded bg-gray-lightest'}>true</code> if they
              match one or more rollout
              conditions.
            </div>
          ) : null}
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
               current.setIsEnabled(!current.isActive)
            }}
            label={current.isActive ? 'Enabled' : 'Disabled'}
          />
        </div>

        <div className={'mt-4'}>
          <label className={'font-semibold'}>Rollout Conditions</label>
          <div className={'text-sm text-disabled-text flex items-center gap-1'}>
            Indicate the users for whom you intend to make this flag available.
            Keep in mind that each set of conditions will be deployed separately from one another.
          </div>
        </div>
      </div>

    </div>
  )
}

export default observer(NewFFlag)
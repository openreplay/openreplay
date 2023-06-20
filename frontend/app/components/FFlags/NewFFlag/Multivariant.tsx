import React from 'react';
import { Rollout, Payload } from './Helpers';
import { Input, Button, Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import cn from 'classnames';

function Multivariant() {
  const { featureFlagsStore } = useStore();

  const avg = React.useMemo(() => {
    return Math.floor(100 / featureFlagsStore.currentFflag!.variants.length);
  }, [featureFlagsStore.currentFflag!.variants.length]);

  return (
    <div>
      <div className={'flex items-center gap-2 font-semibold mt-4'}>
        <div style={{ flex: 1 }}>Variant</div>
        <div style={{ flex: 3 }}>Key</div>
        <div style={{ flex: 3 }}>Description</div>
        <div style={{ flex: 3 }}>
          <Payload />
        </div>
        <div style={{ flex: 3 }} className={'flex items-center gap-2'}>
          <Rollout />{' '}
          <Button
            variant={'text-primary'}
            onClick={featureFlagsStore.currentFflag!.redistributeVariants}
          >
            Distribute Equally
          </Button>
        </div>
      </div>
      <div>
        {featureFlagsStore.currentFflag!.variants.map((variant, ind) => {
          console.log(variant, featureFlagsStore.currentFflag)
          return (
          <div className={'flex items-center gap-2 my-2 '} key={variant.index}>
            <div style={{ flex: 1 }}>
              <div className={'p-2 text-center bg-gray-lightest rounded-full w-10 h-10'}>
                {ind + 1}
              </div>
            </div>
            <div style={{ flex: 4 }}>
              <Input
                placeholder={'buy-btn-variant-1'}
                value={variant.value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  variant.setKey(e.target.value)
                }
              />
            </div>
            <div style={{ flex: 4 }}>
              <Input
                placeholder={'Very red button'}
                value={variant.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  variant.setDescription(e.target.value)
                }
              />
            </div>
            <div style={{ flex: 4 }}>
              <Input
                placeholder={"Example: very important button, {'buttonColor': 'red'}"}
                value={variant.payload}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  variant.setPayload(e.target.value)
                }
              />
            </div>
            <div style={{ flex: 4 }} className={'flex items-center gap-2'}>
              <Input
                className={
                  featureFlagsStore.currentFflag!.isRedDistribution
                    ? '!border-red !text-red !w-full'
                    : '!w-full'
                }
                type={'tel'}
                placeholder={avg}
                value={variant.rolloutPercentage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  variant.setRollout(parseInt(e.target.value.replace(/\D/g, ''), 10))
                }
              />
              <div
                className={cn(
                  'p-2 cursor-pointer rounded ml-auto',
                  featureFlagsStore.currentFflag!.variants.length === 1
                    ? 'cursor-not-allowed'
                    : 'hover:bg-teal-light'
                )}
                onClick={() =>
                  featureFlagsStore.currentFflag!.variants.length === 1
                    ? null
                    : featureFlagsStore.currentFflag!.removeVariant(variant.index)
                }
              >
                <Icon
                  name={'trash'}
                  color={featureFlagsStore.currentFflag!.variants.length === 1 ? '' : 'main'}
                />
              </div>
            </div>
          </div>)})}
      </div>
      <Button variant={'text-primary'} onClick={featureFlagsStore.currentFflag!.addVariant}>
        + Add Variant
      </Button>
    </div>
  );
}

export default observer(Multivariant);

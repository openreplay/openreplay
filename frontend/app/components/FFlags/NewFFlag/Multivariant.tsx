import React from 'react';
import { Rollout, Payload } from './Helpers';
import { Input, Button, Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import cn from 'classnames';

const alphabet = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

function Multivariant() {
  const { featureFlagsStore } = useStore();

  const avg = React.useMemo(() => {
    return Math.floor(100 / featureFlagsStore.currentFflag!.variants.length);
  }, [featureFlagsStore.currentFflag!.variants.length]);

  return (
    <div>
      <div className={'text-sm text-disabled-text mt-1 flex items-center gap-1'}>
        Users who meet release conditions will be server variant's
        <code className={'p-1 text-red rounded bg-gray-lightest'}>key</code> based on specific
        distribution.
      </div>
      <div className={'flex items-center gap-2 font-semibold mt-4'}>
        <div style={{ flex: 1 }}>Variant</div>
        <div style={{ flex: 4 }}>Key</div>
        <div style={{ flex: 4 }}>Description</div>
        <div style={{ flex: 4 }}>
          <Payload />
        </div>
        <div style={{ flex: 4 }} className={'flex items-center'}>
          <Rollout />
          <Button
            variant={'text-primary'}
            className={'font-normal ml-auto'}
            onClick={featureFlagsStore.currentFflag!.redistributeVariants}
          >
            Distribute Equally
          </Button>
        </div>
      </div>
      <div>
        {featureFlagsStore.currentFflag!.variants.map((variant, ind) => {
          return (
            <div className={'flex items-center gap-2 my-2 '} key={variant.index}>
              <div style={{ flex: 1 }}>
                <div className={'p-2 text-center bg-gray-lightest rounded-full w-10 h-10'}>
                  {alphabet[ind] || ind + 1}
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
                  className={'!flex-1'}
                  type={'tel'}
                  wrapperClassName={'flex-1'}
                  placeholder={avg}
                  value={variant.rolloutPercentage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    variant.setRollout(parseInt(e.target.value.replace(/\D/g, ''), 10))
                  }
                />
                <div
                  className={cn(
                    'p-2 cursor-pointer rounded',
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
            </div>
          );
        })}
      </div>
      <div className={'mt-2 flex justify-between w-full pr-4'}>
        <Button variant={'text-primary'} onClick={featureFlagsStore.currentFflag!.addVariant}>
          + Add Variant
        </Button>
        {featureFlagsStore.currentFflag!.isRedDistribution ? (
          <div className={'text-red'}>Total distribution is less than 100%</div>
        ) : null}
      </div>
    </div>
  );
}

export default observer(Multivariant);

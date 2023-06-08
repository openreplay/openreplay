import React from 'react';
import FFlagsListHeader from 'Components/FFlags/FFlagsListHeader';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { NoContent, Loader } from 'UI';
import FFlagItem from './FFlagItem';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function FFlagsList({ siteId }: { siteId: string }) {
  const { featureFlagsStore } = useStore();

  React.useEffect(() => {
    void featureFlagsStore.fetchFlags();
  }, []);
  return (
    <div
      className={'mb-5 w-full mx-auto bg-white rounded px-4 pb-10 pt-4 widget-wrapper'}
      style={{ maxWidth: '1300px' }}
    >
      <FFlagsListHeader siteId={siteId} />
      <Loader loading={featureFlagsStore.isLoading}>
        <div className="w-full h-full">
          <NoContent
            show={featureFlagsStore.flags.length === 0}
            title={
              <div className={'flex flex-col items-center justify-center'}>
                <AnimatedSVG name={ICONS.NO_FFLAGS} size={285} />
                <div className="text-center text-gray-600 mt-4">
                  You haven't created any feature flags yet.
                </div>
              </div>
            }
            subtext={
              <div className="text-center flex justify-center items-center flex-col">
                Use feature flags to deploy and rollback new functionality with ease.
              </div>
            }
          >
            <div>
              <div className={'border-y px-3 py-2 mt-2 flex items-center w-full justify-end gap-4'}>
                <div>status</div>
                <div>All feature flags</div>
                <div>Newest</div>
              </div>
              <div className={'flex items-center font-semibold border-b py-2'}>
                <div style={{ flex: 1 }}>Key</div>
                <div style={{ flex: 1 }}>Rollout condition</div>
                <div style={{ flex: 1 }}>Last modified</div>
                <div style={{ flex: 1 }}>Last modified by</div>
                <div style={{ flex: 1 }}>Status</div>
              </div>

              {featureFlagsStore.flags.map((flag) => (
                <FFlagItem flag={flag} />
              ))}
            </div>
          </NoContent>
        </div>
      </Loader>
    </div>
  );
}

export default observer(FFlagsList);

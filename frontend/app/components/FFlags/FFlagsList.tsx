import React from 'react';
import FFlagsListHeader from 'Components/FFlags/FFlagsListHeader';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Loader, NoContent } from 'UI';
import FFlagItem from './FFlagItem';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import Select from 'Shared/Select';

function FFlagsList({ siteId }: { siteId: string }) {
  const { featureFlagsStore, userStore } = useStore();

  React.useEffect(() => {
    void featureFlagsStore.fetchFlags();
    void userStore.fetchUsers();
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
                <div className={'flex items-center gap-2'}>
                  Status:
                  <Select
                    options={[
                      { label: 'All', value: '0' as const },
                      { label: 'Only active', value: '1' as const },
                      { label: 'Only inactive', value: '2' as const },
                    ]}
                    defaultValue={featureFlagsStore.activity}
                    plain
                    onChange={
                    ({ value }) => {
                      featureFlagsStore.setActivity(value.value);
                      void featureFlagsStore.fetchFlags();
                    }}
                  />
                </div>
                <div>
                  <Select
                    options={[
                      { label: 'Newest', value: 'DESC' },
                      { label: 'Oldest', value: 'ASC' },
                    ]}
                    defaultValue={featureFlagsStore.sort.order}
                    plain
                    onChange={
                      ({ value }) => {
                        featureFlagsStore.setSort({ query: '', order: value.value })
                        void featureFlagsStore.fetchFlags();
                      }}
                  />
                </div>
              </div>
              <div className={'flex items-center font-semibold border-b py-2'}>
                <div style={{ flex: 1 }}>Key</div>
                <div style={{ flex: 1 }}>Type</div>
                <div style={{ flex: 1 }}>Last modified</div>
                <div style={{ flex: 1 }}>Last modified by</div>
                <div style={{ marginLeft: 'auto', width: 115 }}>Status</div>
              </div>

              {featureFlagsStore.flags.map((flag) => (
                <React.Fragment key={flag.featureFlagId}>
                  <FFlagItem flag={flag} />
                </React.Fragment>
              ))}
            </div>
          </NoContent>
        </div>
      </Loader>
    </div>
  );
}

export default observer(FFlagsList);

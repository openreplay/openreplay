import React from 'react';
import { numberWithCommas } from 'App/utils';
import withPermissions from 'HOCs/withPermissions';
import FFlagsListHeader from 'Components/FFlags/FFlagsListHeader';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Loader, NoContent, Pagination } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import Select from 'Shared/Select';
import usePageTitle from '@/hooks/usePageTitle';
import FFlagItem from './FFlagItem';
import { useTranslation } from 'react-i18next';

function FFlagsList({ siteId }: { siteId: string }) {
  const { t } = useTranslation();
  usePageTitle('Feature Flags - OpenReplay');
  const { featureFlagsStore, userStore } = useStore();

  React.useEffect(() => {
    void featureFlagsStore.fetchFlags();
    void userStore.fetchUsers();
  }, []);

  return (
    <div
      className="mb-5 w-full mx-auto bg-white rounded pb-10 pt-4 widget-wrapper"
      style={{ maxWidth: '1360px' }}
    >
      <FFlagsListHeader siteId={siteId} />
      <div className="border-y px-3 py-2 mt-2 flex items-center w-full justify-end gap-4">
        <div className="flex items-center gap-2">
          {t('Status:')}
          <Select
            options={[
              { label: t('All'), value: '0' as const },
              { label: t('Enabled'), value: '1' as const },
              { label: t('Disabled'), value: '2' as const },
            ]}
            defaultValue={featureFlagsStore.activity}
            plain
            onChange={({ value }) => {
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
            onChange={({ value }) => {
              featureFlagsStore.setSort({ query: '', order: value.value });
              void featureFlagsStore.fetchFlags();
            }}
          />
        </div>
      </div>
      <Loader loading={featureFlagsStore.isLoading}>
        <div className="w-full h-full">
          <NoContent
            show={featureFlagsStore.flags.length === 0}
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_FFLAGS} size={60} />
                <div className="text-center  mt-4  text-lg font-medium">
                  {featureFlagsStore.sort.query === ''
                    ? t("You haven't created any feature flags yet")
                    : t('No matching results')}
                </div>
              </div>
            }
            subtext={
              featureFlagsStore.sort.query === '' ? (
                <div className="text-center flex justify-center items-center flex-col">
                  {t(
                    'Use feature flags to deploy and rollback new functionality with ease.',
                  )}
                </div>
              ) : null
            }
          >
            <div>
              <div className="flex items-center font-semibold border-b py-2 px-6">
                <div style={{ flex: 1 }}>{t('Key')}</div>
                <div style={{ flex: 1 }}>{t('Last modified')}</div>
                <div style={{ flex: 1 }}>{t('By')}</div>
                <div style={{ marginLeft: 'auto', width: 115 }}>
                  {t('Status')}
                </div>
              </div>

              {featureFlagsStore.flags.map((flag) => (
                <React.Fragment key={flag.featureFlagId}>
                  <FFlagItem flag={flag} />
                </React.Fragment>
              ))}
            </div>
            <div className="w-full flex items-center justify-between pt-4 px-6">
              <div>
                {t('Showing')}{' '}
                <span className="font-medium">
                  {(featureFlagsStore.page - 1) * featureFlagsStore.pageSize +
                    1}
                </span>{' '}
                {t('to')}{' '}
                <span className="font-medium">
                  {(featureFlagsStore.page - 1) * featureFlagsStore.pageSize +
                    featureFlagsStore.flags.length}
                </span>{' '}
                {t('of')}{' '}
                <span className="font-medium">
                  {numberWithCommas(featureFlagsStore.total)}
                </span>{' '}
                {t('Feature Flags.')}
              </div>
              <Pagination
                page={featureFlagsStore.page}
                total={featureFlagsStore.total}
                onPageChange={(page) => featureFlagsStore.setPage(page)}
                limit={featureFlagsStore.pageSize}
                debounceRequest={100}
              />
            </div>
          </NoContent>
        </div>
      </Loader>
    </div>
  );
}

export default withPermissions(['FEATURE_FLAGS'])(observer(FFlagsList));

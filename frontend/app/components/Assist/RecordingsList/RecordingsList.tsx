import { observer } from 'mobx-react-lite';
import React from 'react';
import { NoContent, Pagination, Loader } from 'UI';
import { useStore } from 'App/mstore';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import RecordsListItem from './RecordsListItem';
import { useTranslation } from 'react-i18next';

function RecordingsList() {
  const { t } = useTranslation();
  const { recordingsStore } = useStore();
  // const [shownRecordings, setRecordings] = React.useState<any[]>([]);
  const { recordings } = recordingsStore;
  const recordsSearch = recordingsStore.search;
  const { page } = recordingsStore;
  const { pageSize } = recordingsStore;
  const { total } = recordingsStore;

  React.useEffect(() => {
    recordingsStore.fetchRecordings();
  }, [page, recordingsStore.period, recordsSearch, recordingsStore.userId]);

  const { length } = recordings;

  return (
    <NoContent
      show={length === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_RECORDINGS} size={60} />
          <div className="text-center mt-4">
            {recordsSearch !== ''
              ? t('No matching results')
              : t('No videos have been recorded in your co-browsing sessions.')}
          </div>
        </div>
      }
      subtext={
        <div className="text-center flex justify-center items-center flex-col">
          <span>
            {t(
              'Capture and share video recordings of co-browsing sessions with your team for product feedback and training.',
            )}
          </span>
        </div>
      }
    >
      <div className="mt-3 border-b">
        <Loader loading={recordingsStore.loading}>
          <div className="grid grid-cols-12 py-2 font-medium px-6">
            <div className="col-span-8">{t('Name')}</div>
            <div className="col-span-4">{t('Recorded by')}</div>
          </div>

          {recordings.map((record: any) => (
            <React.Fragment key={record.recordId}>
              <RecordsListItem record={record} />
            </React.Fragment>
          ))}
        </Loader>
      </div>

      <div className="w-full flex items-center justify-between pt-4 px-6">
        <div className="text-disabled-text">
          {t('Showing')}{' '}
          <span className="font-semibold">{Math.min(length, pageSize)}</span>{' '}
          {t('out of')}&nbsp;<span className="font-semibold">{total}</span>
          &nbsp;{t('Recording')}
        </div>
        <Pagination
          page={page}
          total={total}
          onPageChange={(page) => recordingsStore.updatePage(page)}
          limit={pageSize}
          debounceRequest={100}
        />
      </div>
    </NoContent>
  );
}

export default observer(RecordingsList);

import { observer } from 'mobx-react-lite';
import React from 'react';
import { NoContent, Pagination, Loader } from 'UI';
import { useStore } from 'App/mstore';
import RecordsListItem from './RecordsListItem';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function RecordingsList() {
  const { recordingsStore } = useStore();
  // const [shownRecordings, setRecordings] = React.useState<any[]>([]);
  const recordings = recordingsStore.recordings;
  const recordsSearch = recordingsStore.search;
  const page = recordingsStore.page;
  const pageSize = recordingsStore.pageSize;
  const total = recordingsStore.total;

  React.useEffect(() => {
    recordingsStore.fetchRecordings();
  }, [page, recordingsStore.period, recordsSearch, recordingsStore.userId]);

  const length = recordings.length;

  return (
    <NoContent
      show={length === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_RECORDINGS} size={180} />
          <div className="text-center mt-4">
            {recordsSearch !== ''
              ? 'No matching results'
              : 'No recordings available'}
          </div>
        </div>
      }
      subtext={
        <div className="text-center flex justify-center items-center flex-col">
          <span>
          Capture and share video recordings of co-browsing sessions with your team for product feedback and training.
          </span>
        </div>
      }
    >
      <div className="mt-3 border-b">
        <Loader loading={recordingsStore.loading}>
          <div className="grid grid-cols-12 py-2 font-medium px-6">
            <div className="col-span-8">Name</div>
            <div className="col-span-4">Recorded by</div>
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
          Showing <span className="font-semibold">{Math.min(length, pageSize)}</span> out of{' '}
          <span className="font-semibold">{total}</span> Recording
        </div>
        <Pagination
          page={page}
          totalPages={Math.ceil(total / pageSize)}
          onPageChange={(page) => recordingsStore.updatePage(page)}
          limit={pageSize}
          debounceRequest={100}
        />
      </div>
    </NoContent>
  );
}

export default observer(RecordingsList);

import { observer } from 'mobx-react-lite';
import React from 'react';
import { NoContent, Pagination, Icon } from 'UI';
import { useStore } from 'App/mstore';
import { filterList } from 'App/utils';
import { sliceListPerPage } from 'App/utils';
import RecordsListItem from './RecordsListItem';

function RecordingsList() {
  const { recordingsStore } = useStore();
  const [shownRecordings, setRecordings] = React.useState([]);
  const recordings = recordingsStore.recordings;
  const recordsSearch = recordingsStore.search;

  React.useEffect(() => {
    recordingsStore.fetchRecordings();
  }, []);

  React.useEffect(() => {
    setRecordings(filterList(recordings, recordsSearch, ['createdBy', 'name']));
  }, [recordsSearch]);

  const list = recordsSearch !== '' ? shownRecordings : recordings;
  const lenth = list.length;

  return (
    <NoContent
      show={lenth === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <Icon name="no-recordings" size={80} color="figmaColors-accent-secondary" />
          <div className="text-center text-gray-600 my-4">
            {recordsSearch !== ''
              ? 'No matching results'
              : "No recordings available yet."}
          </div>
        </div>
      }
    >
      <div className="mt-3 border-b">
        <div className="grid grid-cols-12 py-2 font-medium px-6">
          <div className="col-span-8">Name</div>
          <div className="col-span-4">Last Modified</div>
        </div>

        {sliceListPerPage(list, recordingsStore.page - 1, recordingsStore.pageSize).map(
          (record: any) => (
            <React.Fragment key={record.recordId}>
              <RecordsListItem record={record} />
            </React.Fragment>
          )
        )}
      </div>

      <div className="w-full flex items-center justify-between pt-4 px-6">
        <div className="text-disabled-text">
          Showing{' '}
          <span className="font-semibold">{Math.min(list.length, recordingsStore.pageSize)}</span>{' '}
          out of <span className="font-semibold">{list.length}</span> Recording
        </div>
        <Pagination
          page={recordingsStore.page}
          totalPages={Math.ceil(lenth / recordingsStore.pageSize)}
          onPageChange={(page) => recordingsStore.updatePage(page)}
          limit={recordingsStore.pageSize}
          debounceRequest={100}
        />
      </div>
    </NoContent>
  );
}

export default observer(RecordingsList);

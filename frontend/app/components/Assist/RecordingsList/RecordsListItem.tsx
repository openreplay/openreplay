import React from 'react';
import { Icon, ItemMenu } from 'UI';
import { durationFromMs, checkForRecent, getDateFromMill } from 'App/date';
import { IRecord } from 'App/services/RecordingsService';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';
import cn from 'classnames';

interface Props {
  record: IRecord;
}

function RecordsListItem(props: Props) {
  const { record } = props;
  const { recordingsStore } = useStore();
  const [isEdit, setEdit] = React.useState(false);
  const [recordingTitle, setRecordingTitle] = React.useState(record.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onRecordClick = () => {
    recordingsStore.fetchRecordingUrl(record.recordId).then((url) => {
      window.open(url, '_blank');
    });
  };

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.width = `${record.name.length}ch`;
    }
  }, [isEdit, inputRef.current]);

  const onDelete = () => {
    recordingsStore.deleteRecording(record.recordId).then(() => {
      recordingsStore.setRecordings(recordingsStore.recordings.filter(rec => rec.recordId !== record.recordId))
      toast.success('Recording deleted');
    });
  };

  const menuItems = [{ icon: 'trash', text: 'Delete', onClick: onDelete }];

  const onSave = () => {
    recordingsStore.updateRecordingName(record.recordId, recordingTitle);
    setEdit(false);
  };

  return (
    <div className="hover:bg-active-blue border-t px-6">
      <div className="grid grid-cols-12 py-4 select-none items-center">
        <div className="col-span-8 flex items-start">
          <div className="flex items-center capitalize-first">
            <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
              <Icon name="camera-video" size="16" color="tealx" />
            </div>
            <div className="flex flex-col">
              {isEdit ? (
                <input
                  ref={inputRef}
                  name="recordName"
                  placeholder="Recording name"
                  autoFocus
                  style={{ minWidth: 200 }}
                  className="rounded fluid border-0 -mx-2 px-2 -mt-1"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  onBlur={onSave}
                  onFocus={() => setEdit(true)}
                />
              ) : (
                <div
                  onDoubleClick={() => setEdit(true)}
                  className={cn(
                    'border-dotted border-gray-medium',
                    'pt-1 w-fit -mt-2',
                    'cursor-pointer select-none border-b'
                  )}
                >
                  {recordingTitle}
                </div>
              )}
              <div className="text-gray-medium text-sm">{durationFromMs(record.duration)}</div>
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <div className="flex flex-col">
            <div>{record.createdBy}</div>
            <div className="text-gray-medium text-sm">
              {checkForRecent(getDateFromMill(record.createdAt), 'LLL dd, yyyy, hh:mm a')}
            </div>
          </div>
        </div>
        <div className="col-span-2 w-full justify-end flex items-center gap-2">
          <div
            className="group flex items-center gap-1 cursor-pointer link"
            onClick={onRecordClick}
          >
            <Icon name="play" size={18} color="teal" className="!block group-hover:!hidden" />
            <Icon
              name="play-fill-new"
              size={18}
              color="teal"
              className="!hidden group-hover:!block"
            />
            <div>Play Video</div>
          </div>
          <ItemMenu bold items={menuItems} />
        </div>
      </div>
    </div>
  );
}

export default RecordsListItem;

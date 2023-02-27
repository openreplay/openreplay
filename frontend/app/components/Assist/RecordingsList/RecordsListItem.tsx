import React from 'react';
import { Icon, ItemMenu } from 'UI';
import { durationFromMs, formatTimeOrDate } from 'App/date';
import { IRecord } from 'App/services/RecordingsService';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';
import cn from 'classnames';
import EditRecordingModal from './EditRecordingModal';

interface Props {
  record: IRecord;
}

function RecordsListItem(props: Props) {
  const { record } = props;
  const { recordingsStore, settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;
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
      recordingsStore.setRecordings(
        recordingsStore.recordings.filter((rec) => rec.recordId !== record.recordId)
      );
      toast.success('Recording deleted');
    });
  };

  const menuItems = [
    { icon: 'pencil', text: 'Rename', onClick: () => setEdit(true) },
    {
      icon: 'trash',
      text: 'Delete',
      onClick: onDelete,
    },
  ];

  const onSave = (title: string) => {
    recordingsStore
      .updateRecordingName(record.recordId, title)
      .then(() => {
        setRecordingTitle(title);
        toast.success('Recording name updated');
      })
      .catch(() => toast.error("Couldn't update recording name"));
    setEdit(false);
  };

  const onCancel = () => setEdit(false);

  return (
    <div className="hover:bg-active-blue border-t px-6">
      <EditRecordingModal
        show={isEdit}
        title={record.name}
        onSave={onSave}
        closeHandler={onCancel}
      />
      <div className="grid grid-cols-12 py-4 select-none items-center">
        <div className="col-span-8 flex items-start" onClick={onRecordClick}>
          <div className="flex items-center capitalize-first">
            <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
              <Icon name="camera-video" size="16" color="tealx" />
            </div>
            <div className="flex flex-col">
              <div className={cn('pt-1 w-fit -mt-2')}>{recordingTitle}</div>
              <div className="text-gray-medium text-sm">{durationFromMs(record.duration)}</div>
            </div>
          </div>
        </div>
        <div className="col-span-2" onClick={onRecordClick}>
          <div className="flex flex-col">
            <div>{record.createdBy}</div>
            <div className="text-gray-medium text-sm">
              {formatTimeOrDate(record.createdAt, timezone, true)}
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
          <div className="hover:border-teal border border-transparent rounded-full">
            <ItemMenu bold items={menuItems} sm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordsListItem;

import React from 'react';
import { Icon } from 'UI';
import { tagProps, iTag } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ItemMenu } from 'UI';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import { session } from 'App/routes';
import { confirm } from 'UI';
import { filterOutNote as filterOutTimelineNote } from 'Player';

interface Props {
  userEmail: number;
  timestamp: number;
  tags: iTag[];
  isPublic: boolean;
  message: string;
  sessionId: string;
  date: string;
  noteId: number;
  filterOutNote: (id: number) => void;
  onEdit: (noteTooltipObj: Record<string, any>) => void;
}

function NoteEvent(props: Props) {
  const { settingsStore, notesStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  const onEdit = () => {
    props.onEdit({
      isVisible: true,
      isEdit: true,
      time: props.timestamp,
      note: {
        timestamp: props.timestamp,
        tags: props.tags,
        isPublic: props.isPublic,
        message: props.message,
        sessionId: props.sessionId,
        noteId: props.noteId
      },
    });
  };

  const onCopy = () => {
    copy(
      `${window.location.origin}${session(props.sessionId)}${
        props.timestamp > 0 ? '?jumpto=' + props.timestamp : ''
      }`
    );
    toast.success('Note URL copied to clipboard');
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to delete this note?`,
      })
    ) {
      notesStore.deleteNote(props.noteId).then((r) => {
        props.filterOutNote(props.noteId);
        filterOutTimelineNote(props.noteId);
        toast.success('Note deleted');
      });
    }
  };
  const menuItems = [
    { icon: 'pencil', text: 'Edit', onClick: onEdit },
    { icon: 'link-45deg', text: 'Copy URL', onClick: onCopy },
    { icon: 'trash', text: 'Delete', onClick: onDelete },
  ];
  return (
    <div
      className="flex items-start flex-col p-2 border"
      style={{ background: 'rgba(253, 243, 155, 0.1)' }}
    >
      <div className="flex items-center w-full">
        <div className="p-2 bg-gray-light rounded-full">
          <Icon name="quotes" color="main" />
        </div>
        <div className="ml-2">
          <div>{props.userEmail}</div>
          <div className="text-disabled-text">
            {formatTimeOrDate(props.date as unknown as number, timezone)}
          </div>
        </div>
        <div className="cursor-pointer ml-auto">
          <ItemMenu bold items={menuItems} />
        </div>
      </div>
      <div>{props.message}</div>
      <div>
        <div className="flex items-center gap-2 flex-wrap w-full">
          {props.tags.length ? (
            <div className="flex items-center gap-1">
              {props.tags.map((tag) => (
                <div
                  key={tag}
                  style={{ background: tagProps[tag], userSelect: 'none' }}
                  className="rounded-xl text-sm px-2 py-1 text-white"
                >
                  {tag}
                </div>
              ))}
            </div>
          ) : null}
          {!props.isPublic ? null : (
            <>
              <Icon name="user-friends" className="ml-2 mr-1" color="gray-dark" /> Team
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default observer(NoteEvent);

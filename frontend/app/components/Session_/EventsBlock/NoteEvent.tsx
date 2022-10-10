import React from 'react';
import { Icon } from 'UI';
import { tagProps, iTag, Note } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ItemMenu } from 'UI';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import { session } from 'App/routes';
import { confirm } from 'UI';
import { filterOutNote as filterOutTimelineNote } from 'Player';
import { TeamBadge } from 'Shared/SessionListContainer/components/Notes';

interface Props {
  note: Note;
  noEdit: boolean;
  userEmail: string;
  filterOutNote: (id: number) => void;
  onEdit: (noteTooltipObj: Record<string, any>) => void;
}

function NoteEvent(props: Props) {
  const { settingsStore, notesStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  console.log(props.noEdit);
  const onEdit = () => {
    props.onEdit({
      isVisible: true,
      isEdit: true,
      time: props.note.timestamp,
      note: {
        timestamp: props.note.timestamp,
        tag: props.note.tag,
        isPublic: props.note.isPublic,
        message: props.note.message,
        sessionId: props.note.sessionId,
        noteId: props.note.noteId,
      },
    });
  };

  const onCopy = () => {
    copy(
      `${window.location.origin}/${window.location.pathname.split('/')[1]}${session(
        props.note.sessionId
      )}${props.note.timestamp > 0 ? '?jumpto=' + props.note.timestamp : ''}`
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
      notesStore.deleteNote(props.note.noteId).then((r) => {
        props.filterOutNote(props.note.noteId);
        filterOutTimelineNote(props.note.noteId);
        toast.success('Note deleted');
      });
    }
  };
  const menuItems = [
    { icon: 'pencil', text: 'Edit', onClick: onEdit, disabled: props.noEdit },
    { icon: 'link-45deg', text: 'Copy URL', onClick: onCopy },
    { icon: 'trash', text: 'Delete', onClick: onDelete },
  ];
  return (
    <div
      className="flex items-start flex-col p-2 border rounded"
      style={{ background: 'rgba(253, 243, 155, 0.1)' }}
    >
      <div className="flex items-center w-full relative">
        <div className="p-3 bg-gray-light rounded-full">
          <Icon name="quotes" color="main" />
        </div>
        <div className="ml-2">
          <div
            className="text-base"
            style={{
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {props.userEmail}, {props.userEmail}
          </div>
          <div className="text-disabled-text text-sm">
            {formatTimeOrDate(props.note.createdAt as unknown as number, timezone)}
          </div>
        </div>
        <div className="cursor-pointer absolute" style={{ right: -10 }}>
          <ItemMenu bold items={menuItems} />
        </div>
      </div>
      <div
        className="text-xl my-3 overflow-y-scroll overflow-x-hidden"
        style={{ maxHeight: 200, maxWidth: 220 }}
      >
        {props.note.message}
      </div>
      <div>
        <div className="flex items-center gap-2 flex-wrap w-full">
          {props.note.tag ? (
            <div
              key={props.note.tag}
              style={{
                // @ts-ignore
                background: tagProps[props.note.tag],
                userSelect: 'none',
                width: 50,
                textAlign: 'center',
                fontSize: 11,
              }}
              className="rounded-full px-2 py-1 text-white text-sm"
            >
              {props.note.tag}
            </div>
          ) : null}
          {!props.note.isPublic ? null : <TeamBadge />}
        </div>
      </div>
    </div>
  );
}

export default observer(NoteEvent);

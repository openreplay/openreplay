import React from 'react';
import { Link } from 'UI';
import PlayLink from 'Shared/SessionItem/PlayLink';
import { tagProps, Note } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ItemMenu } from 'UI';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import { session } from 'App/routes';
import TeamBadge from './TeamBadge';

interface Props {
  note: Note;
}

function NoteItem(props: Props) {
  const { settingsStore, notesStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  const onCopy = () => {
    copy(
      `${window.location.origin}/${window.location.pathname.split('/')[1]}${session(
        props.note.sessionId
      )}${props.note.timestamp > 0 ? `?jumpto=${props.note.timestamp}&note=${props.note.noteId}` : `?note=${props.note.noteId}`}`
    );
    toast.success('Note URL copied to clipboard');
  };
  const onDelete = () => {
    notesStore.deleteNote(props.note.noteId).then((r) => {
      notesStore.fetchNotes();
      toast.success('Note deleted');
    });
  };
  const menuItems = [
    { icon: 'link-45deg', text: 'Copy Note URL', onClick: onCopy },
    { icon: 'trash', text: 'Delete', onClick: onDelete },
  ];

  const safeStrMessage =
    props.note.message.length > 150 ? props.note.message.slice(0, 150) + '...' : props.note.message;
  return (
    <div className="flex items-center p-2 border-b">
      <Link
        style={{ width: '90%' }}
        to={
          session(props.note.sessionId) +
          (props.note.timestamp > 0
            ? `?jumpto=${props.note.timestamp}&note=${props.note.noteId}`
            : `?note=${props.note.noteId}`)
        }
      >
        <div className="flex flex-col gap-1 p-2 rounded cursor-pointer note-hover">
          <div className="py-1 capitalize-first text-lg">{safeStrMessage}</div>
          <div className="flex items-center gap-2">
            {props.note.tag ? (
              <div
                style={{
                  // @ts-ignore
                  background: tagProps[props.note.tag],
                  padding: '1px 6px',
                }}
                className="rounded-full text-white text-xs select-none w-fit"
              >
                {props.note.tag}
              </div>
            ) : null}
            <div className="text-disabled-text flex items-center text-sm">
              <span className="color-gray-darkest mr-1">By </span>
              {props.note.userName},{' '}
              {formatTimeOrDate(props.note.createdAt as unknown as number, timezone)}
              <div className="mx-2" />
              {!props.note.isPublic ? null : <TeamBadge />}
            </div>
          </div>
        </div>
      </Link>
      <div className="ml-auto">
        <PlayLink isAssist={false} viewed={false} sessionId={props.note.sessionId} />
      </div>
      <div className="ml-2 cursor-pointer">
        <ItemMenu bold items={menuItems} />
      </div>
    </div>
  );
}

export default observer(NoteItem);

import React from 'react';
import { Icon } from 'UI';
import PlayLink from 'Shared/SessionItem/PlayLink';
import { tagProps, iTag } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ItemMenu } from 'UI';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import { session } from 'App/routes'

interface Props {
  userId: number;
  timestamp: number;
  tags: iTag[];
  isPublic: boolean;
  description: string;
  sessionId: string;
  date: string;
  noteId: number;
  userEmail: string;
}

function NoteItem(props: Props) {
  const { settingsStore, notesStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  const onCopy = () => {
    copy(`${window.location.origin}${session(props.sessionId)}${props.timestamp > 0 ? '?jumpto=' +  props.timestamp : ''}`);
    toast.success('Note URL copied to clipboard')
  }
  const onDelete = () => {
    notesStore.deleteNote(props.noteId).then(r => {
        notesStore.fetchNotes()
        toast.success('Note deleted')
    })
  };
  const menuItems = [
    { icon: 'link-45deg', text: 'Copy URL', onClick: onCopy },
    { icon: 'trash', text: 'Delete', onClick: onDelete },
]
  return (
    <div
      className="flex items-center p-4 border-b"
      style={{ background: 'rgba(253, 243, 155, 0.1)' }}
    >
      <div className="flex flex-col gap-1">
        <div>{props.description}</div>
        <div className="flex items-center gap-2">
          {props.tags.length ? (
            <div className="flex items-center gap-1">
              {props.tags.map((tag) => (
                <div
                  key={tag}
                  style={{ background: tagProps[tag], userSelect: 'none' }}
                  className="rounded-xl px-2 py-1 mr-2 text-white"
                >
                  {tag}
                </div>
              ))}
            </div>
          ) : null}
          <div className="text-disabled-text flex items-center">
            <span className="text-figmaColors-text-primary mr-1">By </span>
            {props.userEmail}, {formatTimeOrDate(props.date as unknown as number, timezone)}
            {!props.isPublic ? null : (
              <>
                <Icon name="user-friends" className="ml-4 mr-1" color="gray-dark" /> Team
              </>
            )}
          </div>
        </div>
      </div>
      <div className="ml-auto">
        <PlayLink
          isAssist={false}
          viewed={false}
          sessionId={props.sessionId + (props.timestamp > 0 ? '?jumpto=' +  props.timestamp : '')}
        />
      </div>
      <div className="ml-2 cursor-pointer">
        <ItemMenu
          bold
          items={menuItems}
        />
      </div>
    </div>
  );
}

export default observer(NoteItem);

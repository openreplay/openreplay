import React from 'react';
import { Icon } from 'UI';
import { tagProps, Note } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { TeamBadge } from 'Shared/SessionListContainer/components/Notes'

interface Props {
  userEmail: string;
  note: Note;
  notFound?: boolean;
  onClose: () => void;
}

function ReadNote(props: Props) {
  const { settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  if (props.notFound) {
    return (
      <div style={{ position: 'absolute', top: '45%', left: 'calc(50% - 200px)' }}>
        <div
          className="flex items-start flex-col p-4 border gap-2 rounded"
          style={{ background: '#FFFEF5', width: 400 }}
        >
          <div className="flex items-start font-semibold w-full text-xl">
            <div style={{ flex: 9 }}>You do not have access to this note. <br /> Or it’s deleted.</div>
            <div style={{ flex: 1 }} className="cursor-pointer ml-auto" onClick={props.onClose}>
              <Icon name="close" size={18} />
            </div>
          </div>
          <div
            onClick={props.onClose}
            className="rounded py-2 px-4 mt-2 bg-active-blue flex items-center text-blue gap-2 cursor-pointer hover:bg-active-blue-border"
          >
            <Icon size={16} name="play-fill" color="main" />
            <span>Play Session</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' }} className="flex items-center justify-center">
        <div
          className="flex items-start !text-lg flex-col p-4 border gap-2 rounded"
          style={{ background: '#FFFEF5', width: 500 }}
        >
          <div className="flex items-center w-full">
            <div className="p-2 bg-gray-light rounded-full">
              <Icon name="quotes" color="main" size={16} />
            </div>
            <div className="ml-2">
              <div className="text-base">{props.userEmail}</div>
              <div className="text-disabled-text text-sm">
                {formatTimeOrDate(props.note.createdAt as unknown as number, timezone)}
              </div>
            </div>
            <div className="ml-auto cursor-pointer self-start" onClick={props.onClose}>
              <Icon name="close" size={18} />
            </div>
          </div>
          <div className="text-xl py-3 overflow-y-scroll" style={{ maxHeight: 400 }}>{props.note.message}</div>
          <div className="w-full">
            <div className="flex items-center gap-2 flex-wrap w-full">
              {props.note.tag ? (
                    <div
                      // @ts-ignore
                      style={{ background: tagProps[props.note.tag], userSelect: 'none', fontSize: 11 }}
                      className="rounded-full text-sm px-2 py-1 text-white flex items-center justify-center"
                    >
                      {props.note.tag}
                    </div>
              ) : null}
              {!props.note.isPublic ? null : (
                <TeamBadge />
              )}

              <div
                onClick={props.onClose}
                className="ml-auto rounded py-2 px-4 flex items-center text-blue gap-2 cursor-pointer border border-main hover:bg-light-blue-bg"
              >
                <Icon size={16} name="play-fill" color="main" />
                <span>Play Session</span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

export default observer(ReadNote);

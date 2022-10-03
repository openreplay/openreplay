import React from 'react';
import { Icon } from 'UI';
import { tagProps, iTag } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {
  userEmail: number;
  timestamp: number;
  tags: iTag[];
  isPublic: boolean;
  message: string;
  sessionId: string;
  date: string;
  noteId: number;
  onClose: () => void;
  notFound?: boolean;
}

function ReadNote(props: Props) {
  const { settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  if (props.notFound) {
    return (
      <div style={{ position: 'absolute', top: '45%', left: 'calc(50% - 200px)' }}>
        <div
          className="flex items-start flex-col p-4 border gap-2"
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
    <div style={{ position: 'absolute', top: '45%', left: 'calc(50% - 300px)' }}>
      <div
        className="flex items-start flex-col p-4 border gap-2"
        style={{ background: '#FFFEF5', width: 600 }}
      >
        <div className="flex items-center w-full">
          <div className="p-2 bg-gray-light rounded-full">
            <Icon name="quotes" color="main" size={16} />
          </div>
          <div className="ml-2">
            <div>{props.userEmail}</div>
            <div className="text-disabled-text">
              {formatTimeOrDate(props.date as unknown as number, timezone)}
            </div>
          </div>
          <div className="ml-auto cursor-pointer" onClick={props.onClose}>
            <Icon name="close" size={18} />
          </div>
        </div>
        <div>{props.message}</div>
        <div className="w-full">
          <div className="flex items-center gap-2 flex-wrap w-full">
            {props.tags.length ? (
              <div className="flex items-center gap-1">
                {props.tags.map((tag) => (
                  <div
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

            <div
              onClick={props.onClose}
              className="ml-auto rounded py-2 px-4 bg-active-blue flex items-center text-blue gap-2 cursor-pointer hover:bg-active-blue-border"
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

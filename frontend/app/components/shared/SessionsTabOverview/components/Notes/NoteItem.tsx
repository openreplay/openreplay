import React from 'react';
import { Link, confirm, ItemMenu } from 'UI';
import { tagProps, Note } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import { session } from 'App/routes';
import { Tag } from 'antd';
import TeamBadge from './TeamBadge';
import { useTranslation } from 'react-i18next';

interface Props {
  note: Note;
}

function NoteItem(props: Props) {
  const { settingsStore, notesStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;
  const { t } = useTranslation();

  const onCopy = () => {
    copy(
      `${window.location.origin}/${window.location.pathname.split('/')[1]}${session(
        props.note.sessionId,
      )}${props.note.timestamp > 0 ? `?jumpto=${props.note.timestamp}&note=${props.note.noteId}` : `?note=${props.note.noteId}`}`,
    );
    toast.success(t('Note URL copied to clipboard'));
  };
  const onDelete = async () => {
    if (
      await confirm({
        header: t('Confirm'),
        confirmButton: t('Yes, delete'),
        confirmation: t('Are you sure you want to delete this note?'),
      })
    ) {
      notesStore.deleteNote(props.note.noteId).then((r) => {
        notesStore.fetchNotes();
        toast.success(t('Note deleted'));
      });
    }
  };
  const menuItems = [
    { icon: 'link-45deg', text: t('Copy Link'), onClick: onCopy },
    { icon: 'trash', text: t('Delete'), onClick: onDelete },
  ];

  const safeStrMessage =
    props.note.message.length > 150
      ? `${props.note.message.slice(0, 150)}...`
      : props.note.message;
  return (
    <div className="flex items-center px-2 border-b hover:bg-amber-50 justify-between py-2">
      <Link
        style={{ width: '90%' }}
        to={
          session(props.note.sessionId) +
          (props.note.timestamp > 0
            ? `?jumpto=${props.note.timestamp}&note=${props.note.noteId}`
            : `?note=${props.note.noteId}`)
        }
      >
        <div className="flex flex-col p-2 rounded cursor-pointer justify-between">
          <div className="flex py-1 text-base">
            {props.note.tag ? (
              <Tag
                color={tagProps[props.note.tag]}
                className="border-0 rounded-lg hover:inherit gap-2 w-14 text-center"
                bordered={false}
              >
                {props.note.tag}
              </Tag>
            ) : null}

            <div className="cap-first font-normal">{safeStrMessage}</div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center text-sm text-start">
              <span className="text-gray-600 mr-1 capitalize text-start">
                {t('By')}{' '}
              </span>
              {props.note.userName},{' '}
              {formatTimeOrDate(
                props.note.createdAt as unknown as number,
                timezone,
              )}
              <div className="mx-2" />
              {!props.note.isPublic ? null : <TeamBadge />}
            </div>
          </div>
        </div>
      </Link>
      {/*
      <div className="ml-auto">
        <PlayLink isAssist={false} viewed={false} sessionId={props.note.sessionId} />
      </div> */}
      <div className="ml-2 cursor-pointer">
        <ItemMenu bold items={menuItems} />
      </div>
    </div>
  );
}

export default observer(NoteItem);

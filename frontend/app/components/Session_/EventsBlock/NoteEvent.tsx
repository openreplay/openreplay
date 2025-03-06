import React from 'react';
import { tagProps, Note } from 'App/services/NotesService';
import { formatTimeOrDate, shortDurationFromMs } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';
import { session } from 'App/routes';
import { confirm, Icon } from 'UI';
import { TeamBadge } from 'Shared/SessionsTabOverview/components/Notes';
import { Tag, Dropdown, Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { MessageSquareDot } from 'lucide-react';
import { noNoteMsg } from 'App/mstore/notesStore';

interface Props {
  note: Note;
  noEdit: boolean;
  filterOutNote: (id: number) => void;
  setActiveTab: (tab: string) => void;
}

function NoteEvent(props: Props) {
  const { settingsStore, notesStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  const onEdit = () => {
    notesStore.setEditNote(props.note);
    props.setActiveTab('HIGHLIGHT');
  };

  const onCopy = () => {
    copy(
      `${window.location.origin}/${
        window.location.pathname.split('/')[1]
      }${session(props.note.sessionId)}${
        props.note.timestamp > 0
          ? `?jumpto=${props.note.timestamp}&note=${props.note.noteId}`
          : `?note=${props.note.noteId}`
      }`,
    );
    toast.success('Note URL copied to clipboard');
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: 'Are you sure you want to delete this note?',
      })
    ) {
      notesStore.deleteNote(props.note.noteId).then((r) => {
        props.filterOutNote(props.note.noteId);
        toast.success('Note deleted');
      });
    }
  };
  const menuItems = [
    {
      icon: <Icon name="pencil" />,
      label: 'Edit',
      key: '1',
      onClick: onEdit,
      disabled: props.noEdit,
    },
    {
      icon: <Icon name="link-45deg" />,
      label: 'Copy URL',
      key: '2',
      onClick: onCopy,
    },
    {
      icon: <Icon name="trash" />,
      label: 'Delete',
      key: '3',
      onClick: onDelete,
    },
  ];

  return (
    <div
      className="flex items-start flex-col p-2 border rounded ps-4"
      style={{ background: 'rgba(252, 193, 0, 0.1)' }}
    >
      <div className="flex items-center w-full relative">
        <MessageSquareDot size={16} strokeWidth={1} />
        <div className="ml-2">
          <div
            className="text-base"
            style={{
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {props.note.userName}
          </div>
          <div className="text-disabled-text text-xs">
            {props.note.startAt !== undefined
              ? shortDurationFromMs(props.note.startAt)
              : formatTimeOrDate(
                  props.note.createdAt as unknown as number,
                  timezone,
                )}
          </div>
        </div>
        <div className="cursor-pointer absolute" style={{ right: -5 }}>
          <Dropdown menu={{ items: menuItems }}>
            <Button size="small">
              <MoreOutlined />
            </Button>
          </Dropdown>
        </div>
      </div>
      <div
        className="text-base capitalize-first my-3 overflow-y-scroll overflow-x-hidden"
        style={{ maxHeight: 200, maxWidth: 220 }}
      >
        {props.note.message || noNoteMsg}
      </div>
      <div>
        <div className="flex items-center flex-wrap w-full">
          {props.note.tag ? (
            <Tag
              color={tagProps[props.note.tag]}
              bordered={false}
              className="rounded-lg"
            >
              {props.note.tag}
            </Tag>
          ) : null}
          {!props.note.isPublic ? null : <TeamBadge />}
        </div>
      </div>
    </div>
  );
}

export default observer(NoteEvent);

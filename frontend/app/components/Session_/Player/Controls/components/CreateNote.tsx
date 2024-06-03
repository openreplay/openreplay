import { Tag } from 'antd';
import { List } from 'immutable';
import { Duration } from 'luxon';
import React from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import {
  Note,
  TAGS,
  WriteNote,
  iTag,
  tagProps,
} from 'App/services/NotesService';
import { fetchList as fetchSlack } from 'Duck/integrations/slack';
import { fetchList as fetchTeams } from 'Duck/integrations/teams';
import { addNote, updateNote } from 'Duck/sessions';
import { Button, Checkbox, Icon } from 'UI';

import Select from 'Shared/Select';

interface Props {
  time: number;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  sessionId: string;
  isEdit?: boolean;
  editNote?: WriteNote;
  slackChannels: List<Record<string, any>>;
  teamsChannels: List<Record<string, any>>;
  fetchSlack: () => void;
  fetchTeams: () => void;
  hideModal: () => void;
}

function CreateNote({
  time,
  sessionId,
  isEdit,
  editNote,
  updateNote,
  slackChannels,
  fetchSlack,
  teamsChannels,
  fetchTeams,
  hideModal,
}: Props) {
  const [text, setText] = React.useState('');
  const [slackChannel, setSlackChannel] = React.useState('');
  const [teamsChannel, setTeamsChannel] = React.useState('');
  const [isPublic, setPublic] = React.useState(false);
  const [tag, setTag] = React.useState<iTag>(TAGS[0]);
  const [useTimestamp, setUseTs] = React.useState(true);
  const [useSlack, setSlack] = React.useState(false);
  const [useTeams, setTeams] = React.useState(false);

  const inputRef = React.createRef<HTMLTextAreaElement>();
  const { notesStore } = useStore();

  React.useEffect(() => {
    if (isEdit && editNote) {
      setTag(editNote.tag);
      setText(editNote.message);
      setPublic(editNote.isPublic);
      if (editNote.timestamp > 0) {
        setUseTs(true);
      }
    }
  }, [isEdit]);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      fetchSlack();
      fetchTeams();
    }
  }, []);

  const duration = Duration.fromMillis(time || 0).toFormat('mm:ss');

  const cleanUp = () => {
    setText('');
    setTag(TAGS[0]);
    hideModal();
  };
  const onSubmit = () => {
    if (text === '') return;

    const note: WriteNote = {
      message: text,
      tag,
      timestamp: useTimestamp
        ? Math.floor(isEdit && editNote ? editNote.timestamp : time)
        : -1,
      isPublic,
    };
    const onSuccess = (noteId: string) => {
      if (slackChannel) {
        notesStore.sendSlackNotification(noteId, slackChannel);
      }
      if (teamsChannel) {
        notesStore.sendMsTeamsNotification(noteId, teamsChannel);
      }
    };
    if (isEdit && editNote) {
      return notesStore
        .updateNote(editNote.noteId!, note)
        .then((r) => {
          toast.success('Note updated');
          notesStore.fetchSessionNotes(sessionId).then(() => {
            onSuccess(editNote.noteId!);
            updateNote(r as Note);
          });
        })
        .catch((e) => {
          toast.error('Error updating note');
          console.error(e);
        })
        .finally(() => {
          cleanUp();
        });
    } else {
    return notesStore
      .addNote(sessionId, note)
      .then((r) => {
        onSuccess(r!.noteId as unknown as string);
        toast.success('Note added');
      })
      .catch((e) => {
        toast.error('Error adding note');
        console.error(e);
      })
      .finally(() => {
        cleanUp();
      });
    }
  };

  const closeTooltip = () => {
    hideModal();
  };

  const tagActive = (noteTag: iTag) => tag === noteTag;

  const addTag = (tag: iTag) => {
    setTag(tag);
  };

  const slackChannelsOptions = slackChannels
    .map(({ webhookId, name }) => ({
      value: webhookId,
      label: name,
    }))
    .toJS() as unknown as { value: string; label: string }[];
  const teamsChannelsOptions = teamsChannels
    .map(({ webhookId, name }) => ({
      value: webhookId,
      label: name,
    }))
    .toJS() as unknown as { value: string; label: string }[];

  slackChannelsOptions.unshift({
    // @ts-ignore
    value: null,
    // @ts-ignore
    label: <div className={'text-disabled-text'}>Pick a channel</div>,
    disabled: true,
  });
  teamsChannelsOptions.unshift({
    // @ts-ignore
    value: null,
    // @ts-ignore
    label: <div className={'text-disabled-text'}>Pick a channel</div>,
    disabled: true,
  });

  const changeSlackChannel = ({
    value,
  }: {
    value: Record<string, string>;
    name: string;
  }) => {
    if (value) {
      setSlackChannel(value.value);
    }
  };

  const changeTeamsChannel = ({
    value,
  }: {
    value: Record<string, string>;
    name: string;
  }) => {
    if (value) {
      setTeamsChannel(value.value);
    }
  };

  return (
    <div
      className={'bg-white h-screen w-full p-4 flex flex-col gap-4'}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center">
        <Icon name="quotes" size={20} />
        <h3 className="text-xl ml-2 mr-4 font-semibold">
          {isEdit ? 'Edit Note' : 'Add Note'}
        </h3>
        <div className="ml-auto cursor-pointer" onClick={closeTooltip}>
          <Icon name="close" size={20} />
        </div>
      </div>
      <div
        className="flex items-center cursor-pointer gap-2"
        onClick={() => setUseTs(!useTimestamp)}
      >
        <Checkbox checked={useTimestamp} />
        <span>Add note at current time frame</span>
        <div className={'border px-1 bg-gray-lightest rounded'}>{duration}</div>
      </div>

      <div className="">
        <div className={'font-semibold'}>Note</div>
        <textarea
          ref={inputRef}
          name="message"
          id="message"
          placeholder="Enter your note here..."
          rows={3}
          value={text}
          autoFocus
          onChange={(e) => {
            setText(e.target.value);
          }}
          className="text-area"
        />

        <div className="flex items-center gap-1" style={{ lineHeight: '15px' }}>
          {TAGS.map((tag) => (
            <Tag
              onClick={() => addTag(tag)}
              key={tag}
              className={'cursor-pointer'}
              color={tagActive(tag) ? tagProps[tag] : undefined}
            >
              <div className={'flex items-center gap-2'}>
                {tagActive(tag) ? (
                  <Icon name="check-circle-fill" color="inherit" size={13} />
                ) : null}
                {tag}
              </div>
            </Tag>
          ))}
        </div>
      </div>
      <div
        className={'flex items-center gap-2 cursor-pointer'}
        onClick={() => setPublic(!isPublic)}
      >
        <Checkbox checked={isPublic} />
        <div>Visible to team members</div>
      </div>
      {slackChannelsOptions.length > 1 ? (
        <div className="flex flex-col">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => setSlack(!useSlack)}
          >
            <Checkbox checked={useSlack} />
            <span className="ml-1 mr-3"> Share via Slack </span>
          </div>

          {useSlack && (
            <div>
              <Select
                options={slackChannelsOptions}
                // @ts-ignore
                defaultValue
                // @ts-ignore
                onChange={changeSlackChannel}
                value={slackChannel}
              />
            </div>
          )}
        </div>
      ) : null}

      {teamsChannelsOptions.length > 1 ? (
        <div className="flex flex-col">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => setTeams(!useTeams)}
          >
            <Checkbox checked={useTeams} />
            <span className="ml-1 mr-3"> Share via MS Teams </span>
          </div>

          {useTeams && (
            <div>
              <Select
                options={teamsChannelsOptions}
                // @ts-ignore
                defaultValue
                // @ts-ignore
                onChange={changeTeamsChannel}
                value={teamsChannel}
              />
            </div>
          )}
        </div>
      ) : null}

      <div className="flex">
        <Button
          variant="primary"
          className="mr-4"
          disabled={text === ''}
          onClick={onSubmit}
        >
          {isEdit
            ? 'Save Note'
            : `Add Note ${useTeams || useSlack ? '& Share' : ''}`}
        </Button>
        <Button variant={'text'} onClick={closeTooltip}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default connect(
  (state: any) => {
    const slackChannels = state.getIn(['slack', 'list']);
    const teamsChannels = state.getIn(['teams', 'list']);
    const sessionId = state.getIn(['sessions', 'current']).sessionId;
    return { sessionId, slackChannels, teamsChannels };
  },
  { addNote, updateNote, fetchSlack, fetchTeams }
)(CreateNote);

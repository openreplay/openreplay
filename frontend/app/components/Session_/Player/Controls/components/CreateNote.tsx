import React from 'react';
import { Icon, Button, Checkbox } from 'UI';
import { Duration } from 'luxon';
import { connect } from 'react-redux';
import { WriteNote, tagProps, TAGS, iTag, Note } from 'App/services/NotesService';
import { setCreateNoteTooltip, addNote, updateNote } from 'Duck/sessions';
import stl from './styles.module.css';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';
import { fetchList as fetchSlack } from 'Duck/integrations/slack';
import { fetchList as fetchTeams } from 'Duck/integrations/teams';

import Select from 'Shared/Select';
import { TeamBadge } from 'Shared/SessionsTabOverview/components/Notes';
import { List } from 'immutable';

interface Props {
  isVisible: boolean;
  time: number;
  setCreateNoteTooltip: (state: any) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  sessionId: string;
  isEdit: string;
  editNote: WriteNote;
  slackChannels: List<Record<string, any>>;
  teamsChannels: List<Record<string, any>>;
  fetchSlack: () => void;
  fetchTeams: () => void;
}

function CreateNote({
  isVisible,
  time,
  setCreateNoteTooltip,
  sessionId,
  addNote,
  isEdit,
  editNote,
  updateNote,
  slackChannels,
  fetchSlack,
  teamsChannels,
  fetchTeams,
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
    if (isEdit) {
      setTag(editNote.tag);
      setText(editNote.message);
      setPublic(editNote.isPublic);
      if (editNote.timestamp > 0) {
        setUseTs(true);
      }
    }
  }, [isEdit]);

  React.useEffect(() => {
    if (inputRef.current && isVisible) {
      inputRef.current.focus();
      if (teamsChannels.size === 0 || slackChannels.size === 0) {
        fetchSlack();
        fetchTeams();
      }
    }
  }, [isVisible]);

  const duration = Duration.fromMillis(time || 0).toFormat('mm:ss');

  const cleanUp = () => {
    setCreateNoteTooltip({ isVisible: false, time: 0 });
    setText('');
    setTag(TAGS[0]);
  }
  const onSubmit = () => {
    if (text === '') return;

    const note: WriteNote = {
      message: text,
      tag,
      timestamp: useTimestamp ? Math.floor((isEdit ? editNote.timestamp : time)) : -1,
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
    if (isEdit) {
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
          cleanUp()
        });
    }

    return notesStore
      .addNote(sessionId, note)
      .then((r) => {
        onSuccess(r!.noteId as unknown as string);
        toast.success('Note added');
        void notesStore.fetchSessionNotes(sessionId)
      })
      .catch((e) => {
        toast.error('Error adding note');
        console.error(e);
      })
      .finally(() => {
        cleanUp()
      });
  };

  const closeTooltip = () => {
    cleanUp()
    setCreateNoteTooltip({ isVisible: false, time: 100 });
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

  // @ts-ignore
  slackChannelsOptions.unshift({ value: null, label: 'Pick a channel' });
  // @ts-ignore
  teamsChannelsOptions.unshift({ value: null, label: 'Pick a channel' });

  const changeSlackChannel = ({ value }: { value: Record<string, string>; name: string }) => {
    setSlackChannel(value.value);
  };

  const changeTeamsChannel = ({ value }: { value: Record<string, string>; name: string }) => {
    setTeamsChannel(value.value);
  };

  return (
    <div
      className={stl.noteTooltip}
      style={{
        width: 350,
        left: 'calc(50% - 175px)',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '1rem',
        bottom: '15vh',
        zIndex: 110,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center bg-gray-lightest">
        <Icon name="quotes" size={20} />
        <h3 className="text-xl ml-2 mr-4 font-semibold">{isEdit ? 'Edit Note' : 'Add Note'}</h3>
        <div className="flex items-center cursor-pointer" onClick={() => setUseTs(!useTimestamp)}>
          <Checkbox checked={useTimestamp} />
          <span className="ml-1"> {`at ${duration}`} </span>
        </div>

        <div className="ml-auto cursor-pointer" onClick={closeTooltip}>
          <Icon name="close" size={20} />
        </div>
      </div>

      <div className="">
        <textarea
          ref={inputRef}
          name="message"
          id="message"
          placeholder="Note..."
          rows={3}
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          className="text-area"
        />
      </div>

      <div className="flex items-center gap-2" style={{ lineHeight: '15px' }}>
        {TAGS.map((tag) => (
          <div
            key={tag}
            style={{
              background: tagActive(tag) ? tagProps[tag] : 'rgba(0,0,0, 0.38)',
              userSelect: 'none',
              minWidth: 50,
              fontSize: 11,
            }}
            className="cursor-pointer rounded-full justify-center px-2 py-1 text-white flex items-center gap-2"
            onClick={() => addTag(tag)}
          >
            {tagActive(tag) ? <Icon name="check-circle-fill" color="white" size={13} /> : null}
            <div>{tag}</div>
          </div>
        ))}
      </div>

      {slackChannelsOptions.length > 0 ? (
        <div className="flex flex-col">
          <div className="flex items-center cursor-pointer" onClick={() => setSlack(!useSlack)}>
            <Checkbox checked={useSlack} />
            <span className="ml-1 mr-3"> Send to Slack? </span>
          </div>

          {useSlack && (
            <div>
              <Select
                options={slackChannelsOptions}
                // @ts-ignore
                defaultValue
                // @ts-ignore
                onChange={changeSlackChannel}
              />
            </div>
          )}
        </div>
      ) : null}

      {teamsChannelsOptions.length > 0 ? (
        <div className="flex flex-col">
          <div className="flex items-center cursor-pointer" onClick={() => setTeams(!useTeams)}>
            <Checkbox checked={useTeams} />
            <span className="ml-1 mr-3"> Send to MSTeams? </span>
          </div>

          {useTeams && (
            <div>
              <Select
                options={teamsChannelsOptions}
                // @ts-ignore
                defaultValue
                // @ts-ignore
                onChange={changeTeamsChannel}
              />
            </div>
          )}
        </div>
      ) : null}

      <div className="flex">
        <Button variant="primary" className="mr-4" disabled={text === ''} onClick={onSubmit}>
          {isEdit ? 'Save Note' : 'Add Note'}
        </Button>
        <div className="flex items-center cursor-pointer" onClick={() => setPublic(!isPublic)}>
          <Checkbox checked={isPublic} />
          <TeamBadge />
        </div>
      </div>
    </div>
  );
}

export default connect(
  (state: any) => {
    const {
      isVisible,
      time = 0,
      isEdit,
      note: editNote,
    } = state.getIn(['sessions', 'createNoteTooltip']);
    const slackChannels = state.getIn(['slack', 'list']);
    const teamsChannels = state.getIn(['teams', 'list']);
    const sessionId = state.getIn(['sessions', 'current']).sessionId;
    return { isVisible, time, sessionId, isEdit, editNote, slackChannels, teamsChannels };
  },
  { setCreateNoteTooltip, addNote, updateNote, fetchSlack, fetchTeams }
)(CreateNote);

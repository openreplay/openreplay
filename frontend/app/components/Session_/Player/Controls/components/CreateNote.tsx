import React from 'react';
import { Icon, Button, Checkbox } from 'UI';
import { Duration } from 'luxon';
import { connect } from 'react-redux';
import { WriteNote, tagProps, TAGS, iTag, Note } from 'App/services/NotesService';
import { setCreateNoteTooltip, addNote, updateNote } from 'Duck/sessions';
import stl from './styles.module.css';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';
import { injectNotes } from 'Player';
import { fetchList as fetchSlack } from 'Duck/integrations/slack';
import Select from 'Shared/Select';
import { TeamBadge } from 'Shared/SessionListContainer/components/Notes'
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
  fetchSlack: () => void;
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
}: Props) {
  const [text, setText] = React.useState('');
  const [channel, setChannel] = React.useState('');
  const [isPublic, setPublic] = React.useState(false);
  const [tag, setTag] = React.useState<iTag>(TAGS[0]);
  const [useTimestamp, setUseTs] = React.useState(true);
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
      fetchSlack();
      inputRef.current.focus();
    }
  }, [isVisible]);

  const duration = Duration.fromMillis(time).toFormat('mm:ss');

  const onSubmit = () => {
    if (text === '') return;

    const note: WriteNote = {
      message: text,
      tag,
      timestamp: useTimestamp ? (isEdit ? editNote.timestamp : time) : -1,
      isPublic,
    };
    const onSuccess = (noteId: string) => {
      if (channel) {
        notesStore.sendSlackNotification(noteId, channel)
      }
    }
    if (isEdit) {
      return notesStore
        .updateNote(editNote.noteId, note)
        .then((r) => {
          toast.success('Note updated');
          notesStore.fetchSessionNotes(sessionId).then((notes) => {
            injectNotes(notes);
            onSuccess(editNote.noteId)
            updateNote(r);
          });
        })
        .catch((e) => {
          toast.error('Error updating note');
          console.error(e);
        })
        .finally(() => {
          setCreateNoteTooltip({ isVisible: false, time: 0 });
          setText('');
          setTag(undefined);
        });
    }

    return notesStore
      .addNote(sessionId, note)
      .then((r) => {
        onSuccess(r.noteId as unknown as string)
        toast.success('Note added');
        notesStore.fetchSessionNotes(sessionId).then((notes) => {
          injectNotes(notes);
          addNote(r);
        });
      })
      .catch((e) => {
        toast.error('Error adding note');
        console.error(e);
      })
      .finally(() => {
        setCreateNoteTooltip({ isVisible: false, time: 0 });
        setText('');
        setTag(undefined);
      });
  };

  const closeTooltip = () => {
    setCreateNoteTooltip({ isVisible: false, time: 100 });
  };

  const tagActive = (noteTag: iTag) => tag === noteTag;

  const addTag = (tag: iTag) => {
    setTag(tag);
  };

  const slackChannelsOptions = slackChannels.map(({ webhookId, name }) => ({
    value: webhookId,
    label: name,
  })).toJS() as unknown as { value: string, label: string }[]

  slackChannelsOptions.unshift({ value: null, label: 'Share to slack?' })

  const changeChannel = ({ value, name }: { value: Record<string, string>; name: string }) => {
    setChannel(value.value);
  };

  return (
    <div
      className={stl.noteTooltip}
      style={{
        top: slackChannelsOptions.length > 0 ? -310 : 255,
        width: 350,
        left: 'calc(50% - 175px)',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '1rem',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center bg-gray-lightest">
        <Icon name="quotes" size={20} />
        <h3 className="text-xl ml-2 mr-4 font-semibold">Add Note</h3>
        <div className="flex items-center cursor-pointer" onClick={() => setUseTs(!useTimestamp)}>
          <Checkbox checked={useTimestamp} />
          <span className="ml-1">{`at ${duration}`}</span>
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
          style={{
            border: 'solid thin #ddd',
            borderRadius: 3,
            resize: 'none',
            background: '#ffff',
          }}
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
        <div>
          <Select
            options={slackChannelsOptions}
            // @ts-ignore
            defaultValue
            // @ts-ignore
            onChange={changeChannel}
            className="mr-4"
          />
        </div>
      ) : null}

      <div className="flex">
        <Button variant="primary" className="mr-4" disabled={text === ''} onClick={onSubmit}>
          Add Note
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
  (state) => {
    const {
      isVisible,
      time = 0,
      isEdit,
      note: editNote,
      // @ts-ignore
    } = state.getIn(['sessions', 'createNoteTooltip']);
    // @ts-ignore
    const slackChannels = state.getIn(['slack', 'list']);
    // @ts-ignore
    const sessionId = state.getIn(['sessions', 'current', 'sessionId']);
    return { isVisible, time, sessionId, isEdit, editNote, slackChannels };
  },
  { setCreateNoteTooltip, addNote, updateNote, fetchSlack }
)(CreateNote);

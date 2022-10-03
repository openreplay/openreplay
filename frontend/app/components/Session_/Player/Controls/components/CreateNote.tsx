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

interface Props {
  isVisible: boolean;
  time: number;
  setCreateNoteTooltip: (state: any) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  sessionId: string;
  isEdit: string;
  editNote: WriteNote;
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
}: Props) {
  const [text, setText] = React.useState('');
  const [isPublic, setPublic] = React.useState(false);
  const [tags, setTags] = React.useState([]);
  const [useTimestamp, setUseTs] = React.useState(false);

  const { notesStore } = useStore();

  React.useEffect(() => {
    if (isEdit) {
      setTags(editNote.tags);
      setText(editNote.message);
      setPublic(editNote.isPublic);
      if (editNote.timestamp > 0) {
        setUseTs(true);
      }
    }
  }, [isEdit]);

  const duration = Duration.fromMillis(time).toFormat('mm:ss');
  const stopEvents = (e: any) => {
    e.stopPropagation();
  };

  const onSubmit = () => {
    const note: WriteNote = {
      message: text,
      tags,
      timestamp: useTimestamp ? (isEdit ? editNote.timestamp : time) : -1,
      isPublic,
    };

    if (isEdit) {
      return notesStore.updateNote(editNote.noteId, note).then((r) => {
        toast.success('Note updated');
        notesStore.fetchSessionNotes(sessionId).then((notes) => {
          injectNotes(notes);
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
        setTags([]);
      });
    }

    return notesStore
      .addNote(sessionId, note)
      .then((r) => {
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
        setTags([]);
      });
  };

  const closeTooltip = () => {
    setCreateNoteTooltip({ isVisible: false, time: 0 });
  };

  const tagActive = (tag: iTag) => tags.includes(tag);
  const removeTag = (tag: iTag) => {
    setTags(tags.filter((t) => t !== tag));
  };
  const addTag = (tag: iTag) => {
    setTags([...tags, tag]);
  };

  return (
    <div
      className={stl.noteTooltip}
      style={{
        top: -260,
        width: 350,
        left: 'calc(50% - 175px)',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '1rem',
      }}
      onClick={stopEvents}
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
          name="message"
          id="message"
          placeholder="Note..."
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            border: 'solid thin #ddd',
            borderRadius: 3,
            resize: 'none',
            background: '#ffff',
          }}
        />
      </div>

      <div className="flex items-center">
        {TAGS.map((tag) => (
          <div
            key={tag}
            style={{
              background: tagActive(tag) ? tagProps[tag] : 'rgba(0,0,0, 0.38)',
              userSelect: 'none',
            }}
            className="cursor-pointer rounded-xl px-2 py-1 mr-2 text-white"
            onClick={() => (tagActive(tag) ? removeTag(tag) : addTag(tag))}
          >
            {tag}
          </div>
        ))}
      </div>

      <div className="flex">
        <Button variant="primary" className="mr-4" onClick={onSubmit}>
          Add Note
        </Button>
        <div className="flex items-center cursor-pointer" onClick={() => setPublic(!isPublic)}>
          <Checkbox checked={isPublic} />
          <Icon name="user-friends" size={16} className="mx-1" />
          Visible to the team
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
    const sessionId = state.getIn(['sessions', 'current', 'sessionId']);
    return { isVisible, time, sessionId, isEdit, editNote };
  },
  { setCreateNoteTooltip, addNote, updateNote }
)(CreateNote);

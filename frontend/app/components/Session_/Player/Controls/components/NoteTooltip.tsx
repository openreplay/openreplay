import React from 'react';
import { Icon, Button, Checkbox } from 'UI';
import { Duration } from 'luxon';
import { connect } from 'react-redux';
import stl from './styles.module.css';

interface Props {
  offset: number;
  isVisible: boolean;
  time: number;
}

const TAGS = ['QUERY', 'ISSUE', 'TASK', 'OTHER'];

function NoteTooltip({ offset, isVisible, time }: Props) {
  const duration = Duration.fromMillis(time).toFormat('mm:ss');

  const stopEvents = (e: any) => {
    e.stopPropagation();
  };

  return (
    <div
      className={stl.noteTooltip}
      style={{
        top: -250,
        width: 350,
        left: offset - 20,
        display: isVisible ? 'block' : 'none',
      }}
      onClick={stopEvents}
    >
      <div className="flex items-center">
        <Icon name="quotes" size={20} />
        <h3 className="text-xl ml-2 mr-4 font-semibold">Add Note</h3>
        <div className="flex items-center cursor-pointer">
          <Checkbox />
          <span className="ml-1">{`at ${duration}`}</span>
        </div>

        <div className="ml-auto cursor-pointer">
          <Icon name="close" size={20} />
        </div>
      </div>

      <div>text field</div>

      <div className="flex items-center mt-4">
        {TAGS.map((tag) => (
          <div className="rounded-xl px-2 py-1 mr-2 bg-gray-medium"> {tag} </div>
        ))}
      </div>

      <div className="flex mt-4">
        <Button variant="primary" className="mr-4">
          Add Note
        </Button>
        <div className="flex items-center cursor-pointer">
          <Checkbox />
          <Icon name="user-friends" size={16} className="mx-1" />
          Visible to the team
        </div>
      </div>

      <div className={stl.arrow} />
    </div>
  );
}

export default connect((state) => {
  const { offset = 0, isVisible, time = 0 } = state.getIn(['sessions', 'noteTooltip']);
  return { offset, isVisible, time };
})(NoteTooltip);

import React from 'react';
import { Icon, Button } from 'UI';
import cn from 'classnames';

const Titles = {
  note: 'Note',
  network: 'Fetch/XHR',
  error: 'Console Error',
};

interface Props {
  type: 'note' | 'network' | 'error';
}

function ModalContent(props: Props) {
  const [selected, setSelected] = React.useState([]);
  return (
    <div className="flex flex-col p-4 bg-white gap-4 w-full">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-light-blue-bg">
          <Icon name="quotes" size={18} />
        </div>
        <div className="text-2xl font-semibold">{`Select ${Titles[props.type]}`}</div>
      </div>
      <div
        className="flex flex-col border rounded w-full"
        style={{ background: props.type === 'note' ? '#FFFEF5' : 'white' }}
      >
        <div className="p-2 border-b last:border-b-none w-full">item1</div>
        <div className="p-2 border-b last:border-b-none w-full">item2</div>
      </div>

      <div className="flex items-center gap-2">
        <Button disabled={selected.length === 0} variant="primary">
          Add Selected
        </Button>
        <Button variant="text-primary">Cancel</Button>
      </div>
    </div>
  );
}

interface ModalProps {
  xrayProps: {
    currentLocation: Record<string, any>[];
    resourceList: Record<string, any>[];
    exceptionsList: Record<string, any>[];
    eventsList: Record<string, any>[];
    endTime: number;
  };
  type: 'note' | 'network' | 'error';
}

function SubModal(props: ModalProps) {
  return (
    <div
      className="bg-white overflow-y-scroll absolute"
      style={{ maxWidth: '70vw', width: 620, height: '100vh', top: 0, right: 0, zIndex: 999 }}
    >
      <ModalContent type={props.type} />
    </div>
  );
}

export default SubModal;

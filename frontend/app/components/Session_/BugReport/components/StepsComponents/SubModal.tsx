import React from 'react';
import { Icon, Button } from 'UI';
import { observer } from 'mobx-react-lite';
import { Note } from 'App/services/NotesService';
import { NoteItem, ErrorItem, NetworkReq, SubItem } from './SubModalItems';
import { filterList, debounce } from 'App/utils';
import { useStore } from 'App/mstore';

const Titles = {
  note: 'Notes',
  network: 'Fetch/XHR Errors',
  error: 'Console Errors',
};
const Icons = {
  note: 'quotes' as const,
  network: 'network' as const,
  error: 'info-circle' as const
}
const Filters = {
  note: 'note message or author',
  network: 'url',
  error: 'error name or message',
};

interface Props {
  type: 'note' | 'network' | 'error';
  items: SubItem[];
}

let debounceUpdate: any = () => {};

const SUB_ITEMS = {
  note: NoteItem,
  error: ErrorItem,
  network: NetworkReq,
};

function ModalContent(props: Props) {
  const [searchStr, setSearch] = React.useState('');
  const list =
    searchStr !== ''
      ? filterList(props.items, searchStr, ['url', 'name', 'title', 'message'])
      : props.items;

  React.useEffect(() => {
    debounceUpdate = debounce((val: string) => setSearch(val), 250);
  }, []);

  const SubItem = SUB_ITEMS[props.type];

  return (
    <div className="flex flex-col p-4 bg-white gap-4 w-full">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-light-blue-bg">
          <Icon name={Icons[props.type]} size={18} />
        </div>
        <div className="text-2xl font-semibold">{`Select ${Titles[props.type]}`}</div>
        <div className="ml-auto">
          <input
            onChange={(e) => debounceUpdate(e.target.value)}
            className="bg-white p-2 border border-borderColor-gray-light-shade rounded"
            placeholder={`Filter by ${Filters[props.type]}`}
            style={{ width: 250 }}
          />
        </div>
      </div>
      <div
        className="flex flex-col rounded -mx-4 px-4 py-2 bg-white"
        style={{ height: 'calc(100vh - 130px)', overflowY: 'scroll', maxWidth: '70vw', width: 620 }}
      >
        {list.length > 0 ? (
          list.map((item) => (
            <React.Fragment key={item.key}>
              {/* @ts-ignore */}
              <SubItem item={item} />
            </React.Fragment>
          ))
        ) : (
          <div className="text-2xl font-semibold text-center">No items to show.</div>
        )}
      </div>

      <ModalActionsObs />
    </div>
  );
}

function ModalActions() {
  const { bugReportStore } = useStore();

  const removeModal = () => {
    bugReportStore.toggleSubStepModal(false, bugReportStore.subModalType, undefined);
  };
  const saveChoice = () => {
    bugReportStore.saveSubItems();
    removeModal();
  };
  return (
    <div className="flex items-center gap-2">
      <Button
        disabled={bugReportStore.pickedSubItems[bugReportStore.targetStep].size === 0}
        variant="primary"
        onClick={saveChoice}
      >
        Add Selected
      </Button>
      <Button variant="text-primary" onClick={removeModal}>
        Cancel
      </Button>
    </div>
  );
}

const ModalActionsObs = observer(ModalActions);

interface ModalProps {
  xrayProps: {
    currentLocation: Record<string, any>[];
    resourceList: Record<string, any>[];
    exceptionsList: Record<string, any>[];
    eventsList: Record<string, any>[];
    endTime: number;
  };
  type: 'note' | 'network' | 'error';
  notes: Note[];
  members: Record<string, any>[];
}

function SubModal(props: ModalProps) {
  let items;
  if (props.type === 'note') {
    items = props.notes.map((note) => ({
      type: 'note' as const,
      title: props.members.find((m) => m.id === note.userId)?.email || note.userId,
      message: note.message,
      time: 0,
      key: note.noteId as unknown as string,
    }));
  }
  if (props.type === 'error') {
    items = props.xrayProps.exceptionsList.map((error) => ({
      type: 'error' as const,
      time: error.time,
      message: error.message,
      name: error.name,
      key: error.key,
    }));
  }
  if (props.type === 'network') {
    items = props.xrayProps.resourceList.map((fetch) => ({
      type: 'network' as const,
      time: fetch.time,
      url: fetch.url,
      status: fetch.status,
      success: fetch.success,
      message: fetch.name,
      key: fetch.key,
    }));
  }

  return (
    <div
      className="bg-white fixed"
      style={{
        maxWidth: '70vw',
        overflow: 'hidden',
        width: 620,
        height: '100vh',
        top: 0,
        right: 0,
        zIndex: 999,
      }}
    >
      {/* @ts-ignore */}
      <ModalContent type={props.type} items={items} />
    </div>
  );
}

export default SubModal;

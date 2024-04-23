import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Segmented } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';



import { useStore } from 'App/mstore';
import { TAGS, iTag } from 'App/services/NotesService';



import Select from 'Shared/Select';


const sortOptionsMap = {
  'createdAt-DESC': 'Newest',
  'createdAt-ASC': 'Oldest',
};
const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({ value, label }));
const notesOwner = [
  { value: '0', label: 'All Notes' },
  { value: '1', label: 'My Notes' },
];
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}
function NoteTags() {
  const { notesStore } = useStore();

  return (
    <div className="flex items-center w-full">
      <Segmented
        size="small"
        options={[
          {
            value: 'ALL',
            label: 'All',
          },
          ...TAGS.map((tag: iTag) => ({
            value: tag,
            label: toTitleCase(tag),
          })),
        ]}
        onChange={(value: iTag) => notesStore.toggleTag(value)}
      />
      <div className="ml-auto" />
      <Dropdown
        menu={{
          items: notesOwner.map(({ value, label }) => ({ key: value, label })),
          onClick: ({ key }) => {
            notesStore.toggleShared(key === '1');
          },
        }}
      >
        <div
          className={
            'cursor-pointer flex items-center justify-end gap-2 font-semibold'
          }
        >
          <div>
            {notesStore.ownOnly ? notesOwner[1].label : notesOwner[0].label}
          </div>
          <DownOutlined />
        </div>
      </Dropdown>
      <div className="ml-2 w-2" />
      <Dropdown
        menu={{
          items: sortOptions.map(({ value, label }) => ({ key: value, label })),
          onClick: ({ key }) => {
            notesStore.toggleSort(key);
          },
        }}
      >
        <div
          className={
            'cursor-pointer flex items-center justify-end gap-2 font-semibold'
          }
        >
          <div>
            {notesStore.order === "DESC" ? "Newest" : "Oldest"}
          </div>
          <DownOutlined />
        </div>
      </Dropdown>
    </div>
  );
}

export default observer(NoteTags);

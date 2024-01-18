import { Tag } from 'App/services/TagWatchService';
import { useModal } from 'Components/Modal';
import { refreshFilterOptions } from 'Duck/search';
import { connect } from 'react-redux';
import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { FilterKey } from 'Types/filter/filterType';
import { addOptionsToFilter } from 'Types/filter/newFilter';
import { Button, Icon, confirm } from 'UI';
import { Typography } from 'antd';
import { toast } from 'react-toastify';

function TagList({ refreshFilterOptions }: { refreshFilterOptions: () => void }) {
  const { tagWatchStore } = useStore();
  const { showModal } = useModal();

  React.useEffect(() => {
    if (!tagWatchStore.isLoading) {
      tagWatchStore.getTags().then((tags) => {
        if (tags) {
          addOptionsToFilter(
            FilterKey.TAGGED_ELEMENT,
            tags.map((tag) => ({ label: tag.name, value: tag.tagId.toString() }))
          );
          refreshFilterOptions();
        }
      });
    }
  }, []);

  const openModal = () => {
    showModal(
      <TagListModal
        onDelete={tagWatchStore.deleteTag}
        tags={tagWatchStore.tags}
        onEdit={tagWatchStore.updateTagName}
      />,
      {
        right: true,
        width: 400,
      }
    );
  };
  return (
    <Button variant={'outline'} disabled={!tagWatchStore.tags.length} onClick={openModal}>
      <span>Tags</span>
      <span className={'font-bold ml-1'}>{tagWatchStore.tags.length}</span>
    </Button>
  );
}

function TagListModal({
  tags,
  onEdit,
  onDelete,
}: {
  tags: Tag[];
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}) {
  const updateTagName = (id: number, name: string) => {
    onEdit(id, name);
    // very annoying
    // @ts-ignore
    toast.success('Tag name updated');
  };
  const onRemove = async (id: number) => {
    if (
      await confirm({
        header: 'Remove Tag',
        confirmButton: 'Remove',
        confirmation: 'Are you sure you want to remove this tag?',
      })
    ) {
      onDelete(id);
    }
  };
  return (
    <div className={'h-screen flex flex-col gap-2 p-4'}>
      <div className={'text-2xl font-semibold'}>Tagged Elements</div>
      {tags.map((tag) => (
        <div
          className={
            'w-full border-b border-b-gray-light p-2 hover:bg-active-blue flex items-center gap-2'
          }
        >
          <Icon name={'search'} />
          <Typography.Text
            editable={{ onChange: (e) => e !== tag.name && updateTagName(tag.tagId, e) }}
          >
            {tag.name}
          </Typography.Text>
          <div
            className={'cursor-pointer ml-auto p-2 hover:bg-gray-light rounded'}
            onClick={() => onRemove(tag.tagId)}
          >
            <Icon name={'trash'} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default connect(() => ({}), { refreshFilterOptions })(observer(TagList));

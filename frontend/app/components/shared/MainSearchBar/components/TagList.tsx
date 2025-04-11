import { Tag } from 'App/services/TagWatchService';
import { useModal } from 'Components/Modal';
import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { FilterKey } from 'Types/filter/filterType';
import { addOptionsToFilter } from 'Types/filter/newFilter';
import { Icon, confirm } from 'UI';
import { Button, Typography } from 'antd';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

function TagList() {
  const { searchStore } = useStore();
  const { tagWatchStore } = useStore();
  const { showModal, hideModal } = useModal();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!tagWatchStore.isLoading) {
      tagWatchStore.getTags().then((tags) => {
        if (tags) {
          addOptionsToFilter(
            FilterKey.TAGGED_ELEMENT,
            tags.map((tag) => ({
              label: tag.name,
              value: tag.tagId.toString(),
            })),
          );
          searchStore.refreshFilterOptions();
        }
      });
    }
  }, []);

  const addTag = (tagId: number) => {
    searchStore.addFilterByKeyAndValue(
      FilterKey.TAGGED_ELEMENT,
      tagId.toString(),
    );
    hideModal();
  };
  const openModal = () => {
    showModal(<TagListModal onTagClick={addTag} />, {
      right: true,
      width: 400,
    });
  };
  return (
    <Button
      // variant={'outline'}
      type="primary"
      ghost
      className="gap-1"
      disabled={!tagWatchStore.tags.length}
      onClick={openModal}
    >
      <span>{t('Tags')}</span>
      <span className="font-medium ml-1">{tagWatchStore.tags.length}</span>
    </Button>
  );
}

const TagListModal = observer(
  ({ onTagClick }: { onTagClick: (tagId: number) => void }) => {
    const { tagWatchStore } = useStore();
    const { t } = useTranslation();

    const updateTagName = (id: number, name: string) => {
      void tagWatchStore.updateTagName(id, name);
      // very annoying
      // @ts-ignore
      toast.success('Tag name updated');
    };
    const onRemove = async (id: number) => {
      if (
        await confirm({
          header: t('Remove Tag'),
          confirmButton: t('Remove'),
          confirmation: t('Are you sure you want to remove this tag?'),
        })
      ) {
        void tagWatchStore.deleteTag(id);
      }
    };

    return (
      <div className="h-screen flex flex-col gap-2 p-4">
        <div className="text-2xl font-semibold">{t('Tagged Elements')}</div>
        {tagWatchStore.tags.map((tag) => (
          <TagRow
            key={tag.tagId}
            tag={tag}
            onEdit={updateTagName}
            onDelete={onRemove}
            onTagClick={onTagClick}
          />
        ))}
      </div>
    );
  },
);

function TagRow(props: {
  tag: Tag;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onTagClick: (tagId: number) => void;
}) {
  const { tag, onEdit, onDelete, onTagClick } = props;
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState(tag.name);

  return (
    <div
      className="w-full border-b border-b-gray-light p-2 hover:bg-active-blue flex items-center gap-2 cursor-pointer"
      onClick={() => onTagClick(tag.tagId)}
      key={tag.tagId}
    >
      <Icon name="search" />
      <Typography.Text
        editable={{
          onChange: (e) => {
            if (e !== tag.name) {
              onEdit(tag.tagId, e);
              setName(e);
            }
            setIsEditing(false);
          },
          text: name,
          editing: isEditing,
          onCancel: () => {
            setIsEditing(false);
            setName(tag.name);
          },
          triggerType: [],
          maxLength: 90,
        }}
      >
        {tag.name}
      </Typography.Text>

      <div
        className="cursor-pointer ml-auto p-2 hover:bg-gray-light rounded"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <Icon name="edit" />
      </div>
      <div
        className="cursor-pointer p-2 hover:bg-gray-light rounded"
        onClick={(e) => {
          e.stopPropagation();
          void onDelete(tag.tagId);
        }}
      >
        <Icon name="trash" />
      </div>
    </div>
  );
}

export default observer(TagList);

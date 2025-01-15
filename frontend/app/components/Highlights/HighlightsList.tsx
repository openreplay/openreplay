import React from 'react';
import { observer } from 'mobx-react-lite';
import { GridItem } from 'App/components/Spots/SpotsList/SpotListItem';
import { Input, Tag, Segmented, Modal, Checkbox } from 'antd';
import { iTag, tagProps, TAGS } from 'App/services/NotesService';
import { SortDropdown } from 'Shared/SessionsTabOverview/components/SessionSort/SessionSort';
import { numberWithCommas } from '../../utils';
import { Pagination, NoContent, confirm } from 'UI';
import cn from 'classnames';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Eye, Link } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify'

function HighlightsList() {
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  // if range 0:0 == full session;
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const limit = 9;
  const listLength = 9;
  const total = 100;

  const onSearch = (value: string) => {
    setQuery(value);
    // void spotStore.fetchSpots();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // debouncedFetch();
  };

  const activeTags = ['ALL'];
  const toggleTag = (tag?: iTag) => {
    // void spotStore.toggleTag(tag);
  };

  const onPageChange = (page: number) => {
    setPage(page);
  };

  const isEmpty = false; //true;
  return (
    <div
      className={'relative w-full mx-auto bg-white rounded-lg'}
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex p-2 px-4 w-full border-b gap-4 items-center'}>
        <h1 className={'text-2xl capitalize mr-2'}>Highlights</h1>
        <Segmented
          size="small"
          options={[
            {
              value: 'ALL',
              label: (
                <div
                  className={
                    activeTags.includes('ALL') || activeTags.length === 0
                      ? 'text-main'
                      : ''
                  }
                >
                  All
                </div>
              ),
            },
            ...TAGS.map((tag: iTag) => ({
              value: tag,
              label: (
                <div
                  className={
                    activeTags.includes(tag)
                      ? 'text-main capitalize'
                      : 'capitalize'
                  }
                >
                  {tag.toLowerCase()}
                </div>
              ),
            })),
          ]}
          onChange={(value: iTag) =>
            toggleTag(value === 'ALL' ? undefined : value)
          }
        />
        <div className={'ml-auto'}>
          <SortDropdown
            sortOptions={[
              {
                key: 'own',
                label: 'Personal',
              },
              {
                key: 'team',
                label: 'Team',
              },
            ]}
            onSort={({ key }) => {
              console.log(key);
            }}
            current={'Personal'}
          />
        </div>
        <div className="w-56">
          <Input.Search
            value={query}
            allowClear
            name="spot-search"
            placeholder="Filter by title"
            onChange={handleInputChange}
            onSearch={onSearch}
            className="rounded-lg"
            size='small'
          />
        </div>
      </div>
      <div
        className={cn(
          'py-2 px-4 border-gray-lighter',
          isEmpty
            ? 'h-96 flex items-center justify-center'
            : ' grid grid-cols-3 gap-6'
        )}
      >
        <NoContent
          show={isEmpty}
          subtext={
            <div className={'w-full text-center'}>
              Highlight and note observations during session replays and share
              them with your team.
            </div>
          }
        >
          <HighlightClip openEdit={() => setEditModalOpen(true)} />
          <HighlightClip openEdit={() => setEditModalOpen(true)} />
          <HighlightClip openEdit={() => setEditModalOpen(true)} />
          <HighlightClip openEdit={() => setEditModalOpen(true)} />
          <HighlightClip openEdit={() => setEditModalOpen(true)} />
          <HighlightClip openEdit={() => setEditModalOpen(true)} />
        </NoContent>
        <Modal
          title={'Edit Highlight'}
          open={editModalOpen}
          okText={'Save'}
          width={350}
          centered
          onOk={() => setEditModalOpen(false)}
          onCancel={() => setEditModalOpen(false)}
        >
          <div className={'flex flex-col gap-2'}>
            <Input.TextArea
              placeholder={'Highlight note'}
              onChange={(e) => setNoteText(e.target.value)}
              maxLength={200}
              value={noteText}
            />
            <div>{noteText.length}/200 Characters remaining</div>
            <Checkbox>Team can see and edit this Highlight.</Checkbox>
          </div>
        </Modal>
      </div>
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2',
          isEmpty ? 'hidden' : 'visible'
        )}
      >
        <div>
          Showing <span className="font-medium">{(page - 1) * limit + 1}</span>
          {' to '}
          <span className="font-medium">{(page - 1) * limit + listLength}</span>
          {' of '}
          <span className="font-medium">{numberWithCommas(total)}</span>
          {' highlights'}.
        </div>
        <Pagination
          page={page}
          total={total}
          onPageChange={onPageChange}
          limit={limit}
          debounceRequest={500}
        />
      </div>
    </div>
  );
}

function HighlightClip({
  note = 'Highlight note',
  tag = 'ISSUE',
  user = 'user@openreplay.com',
  createdAt = '12/12/2025',
  hId = '1234',
  openEdit = () => undefined,
}) {
  const copyToClipboard = () => {
    copy(hId);
  };
  const onItemClick = () => {
    console.log('Item clicked');
  };

  const menuItems = [
    {
      key: 'copy',
      icon: <Link size={14} strokeWidth={1} />,
      label: 'Copy Link',
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
    },
    {
      key: 'visibility',
      icon: <Eye strokeWidth={1} size={14} />,
      label: 'Visibility',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
    },
  ];

  const onMenuClick = async ({ key }: any) => {
    switch (key) {
      case 'edit':
        return openEdit();
      case 'copy':
        copyToClipboard();
        toast.success('Highlight link copied to clipboard');
        return
      case 'delete':
        const res = await confirm({
          header: 'Are you sure delete this Highlight?',
          confirmation:
            'Deleting a Highlight will only remove this instance and its associated note. It will not affect the original session.',
          confirmButton: 'Yes, Delete',
        });
        console.log(res);
        return;
      case 'visibility':
        return openEdit();
      default:
        break;
    }
  };
  return (
    <GridItem
      title={note}
      onItemClick={onItemClick}
      thumbnail={null}
      setLoading={() => null}
      loading={false}
      copyToClipboard={copyToClipboard}
      user={user}
      createdAt={createdAt}
      menuItems={menuItems}
      onMenuClick={onMenuClick}
      modifier={
        <div className="left-0 bottom-8 flex relative gap-2 justify-end pe-2 pb-2 ">
          <Tag
            color={tagProps[tag]}
            className="border-0 rounded-lg hover:inherit gap-2 w-14 text-center capitalize"
            bordered={false}
          >
            {tag.toLowerCase()}
          </Tag>
        </div>
      }
    />
  );
}

export default observer(HighlightsList);

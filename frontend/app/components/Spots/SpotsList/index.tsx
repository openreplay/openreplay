import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input } from 'antd';
import { Pin, Puzzle, Share2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Icon, Loader, Pagination } from "UI";
import withPermissions from "../../hocs/withPermissions";

import SpotListItem from './SpotListItem';

const visibilityOptions = {
  all: 'All Spots',
  own: 'My Spots',
} as const;

function SpotsListHeader({
  onDelete,
  showDeleteButton,
}: {
  onDelete: () => void;
  showDeleteButton: boolean;
}) {
  const { spotStore } = useStore();
  const [selectedKey, setSelectedKey] = useState('all');

  const onSearch = (value: string) => {
    spotStore.setQuery(value);
    void spotStore.fetchSpots();
  };

  const onFilterChange = (key: 'all' | 'own') => {
    setSelectedKey(key);
    spotStore.setFilter(key);
    void spotStore.fetchSpots();
  };

  const dropdownProps = {
    items: [
      {
        label: 'All Spots',
        key: 'all',
      },
      {
        label: 'My Spots',
        key: 'own',
      },
    ],
    onClick: ({ key }: any) => onFilterChange(key),
    selectedKeys: [selectedKey],
  };

  return (
    <div className={'flex items-center justify-between w-full'}>
      <div className='flex gap-1 items-center'>
        <Icon name={'orSpot'} size={24} />
        <h1 className={'text-2xl capitalize mr-2'}>Spots</h1>
      </div>
      
      <div className='flex gap-4 items-center'>
          <div className={'ml-auto'}>
            {showDeleteButton && (
              <Button onClick={onDelete} type='primary' ghost>
                Delete Selected
              </Button>
            )}
          </div>

          <Dropdown menu={dropdownProps} className='border'>
          <Button>
              {visibilityOptions[spotStore.filter]}
              <DownOutlined />
            </Button>
          </Dropdown>
          <div className='w-56'>
            <Input.Search
              value={spotStore.query}
              allowClear
              name="spot-search"
              placeholder="Filter by title"
              onChange={(e) => spotStore.setQuery(e.target.value)}
              onSearch={(value) => onSearch(value)}
              className='rounded-lg'
            />
          </div>
        </div>

    </div>
  );
}

function SpotsList() {
  const [selectedSpots, setSelectedSpots] = React.useState<string[]>([]);
  const { spotStore } = useStore();

  React.useEffect(() => {
    void spotStore.fetchSpots();
  }, []);

  const onPageChange = (page: number) => {
    spotStore.setPage(page);
    void spotStore.fetchSpots();
  };

  const onDelete = async (spotId: string) => {
    await spotStore.deleteSpot([spotId]);
    setSelectedSpots(selectedSpots.filter((s) => s !== spotId));
  };

  const batchDelete = async () => {
    await spotStore.deleteSpot(selectedSpots);
    setSelectedSpots([]);
  };

  const onRename = (id: string, newName: string) => {
    return spotStore.updateSpot(id, { name: newName });
  };

  const onVideo = (id: string) => {
    return spotStore.getVideo(id);
  };

  return (
    <div className={'w-full relative'}>

      <div className={'flex mx-auto p-2 px-4 bg-white rounded-lg shadow-sm mb-2 w-full z-50'}>
        <SpotsListHeader
          showDeleteButton={selectedSpots.length > 0}
          onDelete={batchDelete}
        />
      </div>

      <div
        className={'mx-auto pb-4'}
        style={{ maxWidth: 1360 }}
      >
        {spotStore.total === 0 ? (
          spotStore.isLoading ? <Loader /> : <EmptyPage />
        ) : (
          <>
            <div
              className={
                'py-2 border-gray-lighter grid grid-cols-3 gap-6'
              }
            >
              {spotStore.spots.map((spot, index) => (
                <SpotListItem
                  key={index}
                  spot={spot}
                  onDelete={() => onDelete(spot.spotId)}
                  onRename={onRename}
                  onVideo={onVideo}
                  onSelect={(checked: boolean) => {
                    if (checked) {
                      setSelectedSpots([...selectedSpots, spot.spotId]);
                    } else {
                      setSelectedSpots(
                        selectedSpots.filter((s) => s !== spot.spotId)
                      );
                    }
                  }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2">
              <div>
                Showing{' '}
                <span className="font-medium">
                  {(spotStore.page - 1) * spotStore.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {(spotStore.page - 1) * spotStore.limit +
                    spotStore.spots.length}
                </span>{' '}
                of{' '}
                <span className="font-medium">
                  {numberWithCommas(spotStore.total)}
                </span>{' '}
                spots.
              </div>
              <Pagination
                page={spotStore.page}
                total={spotStore.total}
                onPageChange={onPageChange}
                limit={spotStore.limit}
                debounceRequest={500}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyPage() {
  return (
    <div className={'flex flex-col gap-4 items-center w-full border-t pt-2'}>
      <div className={'font-semibold text-xl'}>Spot your first bug</div>
      <div className={'text-disabled-text w-1/2'}>
        Spot is a browser extension by OpenReplay, that captures detailed bug
        reports including screen recordings and technical details that
        developers need to troubleshoot an issue efficiently.
      </div>

      <div className={'flex gap-4 mt-4'}>
        <img src={'assets/img/spot1.jpg'} alt={'pin spot'} width={200} />
        <div className={'flex flex-col gap-2'}>
          <div className={'flex items-center gap-2'}>
            <div
              className={
                '-ml-2 h-8 w-8 bg-[#FFF7E6] rounded-full flex items-center justify-center'
              }
            >
              <span>1</span>
            </div>
            <div className={'font-semibold'}>Pin Spot extension (Optional)</div>
          </div>

          <div className={'flex items-center gap-2'}>
            <Puzzle size={16} strokeWidth={1} />
            <div>Open installed extensions</div>
          </div>
          <div className={'flex items-center gap-2'}>
            <Pin size={16} strokeWidth={1} />
            <div>Pin Spot, for easy access.</div>
          </div>
        </div>
      </div>
      <div className={'flex gap-4 mt-4'}>
        <img src={'assets/img/spot2.jpg'} alt={'start recording'} width={200} />
        <div className={'flex flex-col gap-2'}>
          <div className={'flex items-center gap-2'}>
            <div
              className={
                '-ml-2 h-8 w-8 bg-[#FFF7E6] rounded-full flex items-center justify-center'
              }
            >
              <span>2</span>
            </div>
            <div className={'font-semibold'}>Capture and share a bug</div>
          </div>
          <div className={'flex items-center gap-2'}>
            <Icon name={'orSpot'} size={16} />
            <div>Click the Spot icon to log bugs!</div>
          </div>
          <div className={'flex items-center gap-2'}>
            <Share2 size={16} strokeWidth={1} />
            <div>Share it with your team</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermissions(['SPOT'])(observer(SpotsList));

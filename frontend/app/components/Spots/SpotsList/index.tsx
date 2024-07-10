import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Pagination } from 'UI';

import SpotListItem from './SpotListItem';

const visibilityOptions = {
  all: 'All Spots',
  own: 'My Spots',
} as const;

function SpotsListHeader() {
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
  };

  const { spotStore } = useStore();

  const onSearch = (value: string) => {
    spotStore.setQuery(value);
    void spotStore.fetchSpots();
  };
  const onFilterChange = (key: "all" | "own") => {
    spotStore.setFilter(key);
    void spotStore.fetchSpots();
  };
  return (
    <div className={'flex items-center px-4 gap-4'}>
      <div className={'text-2xl capitalize mr-2'}>Spots</div>
      <div className={'ml-auto'}>
        <Button size={'small'} disabled>
          Delete Selected
        </Button>
      </div>
      <Dropdown menu={dropdownProps}>
        <div className={'cursor-pointer flex items-center justify-end gap-2'}>
          <div>{visibilityOptions[spotStore.filter]}</div>
          <DownOutlined />
        </div>
      </Dropdown>
      <div style={{ width: 210 }}>
        <Input.Search
          value={spotStore.query}
          allowClear
          name="spot-search"
          placeholder="Filter by title"
          onChange={(e) => spotStore.setQuery(e.target.value)}
          onSearch={(value) => onSearch(value)}
        />
      </div>
    </div>
  );
}

function SpotsList() {
  const { spotStore } = useStore();

  React.useEffect(() => {
    void spotStore.fetchSpots();
  }, []);

  const onPageChange = (page: number) => {
    spotStore.setPage(page);
    void spotStore.fetchSpots();
  };

  console.log(spotStore.spots);
  return (
    <div className={'w-full'}>
      <div
        className={'mx-auto bg-white rounded border py-4'}
        style={{ maxWidth: 1360 }}
      >
        <SpotsListHeader />

        <div
          className={
            'py-2 px-0.5 border-t border-b border-gray-lighter grid grid-cols-3 gap-2'
          }
        >
          {spotStore.spots.map((spot, index) => (
            <SpotListItem key={index} spot={spot} />
          ))}
        </div>
        {spotStore.total > 0 && (
          <div className="flex items-center justify-between p-5 w-full">
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
        )}
      </div>
    </div>
  );
}

export default observer(SpotsList);

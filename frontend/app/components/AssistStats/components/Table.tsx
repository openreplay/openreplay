import { DownOutlined } from '@ant-design/icons';
import {numberWithCommas} from "App/utils";
import React from 'react';
import { Button, Dropdown, Space, Typography } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons'
import { Pagination } from 'UI'
import PlayLink from "Shared/SessionItem/PlayLink";

interface Props {
  onSort: (v: string) => void;
}
const PER_PAGE = 10
const sortItems = [
  {
    key: '1',
    label: 'Newest First',
  },
  {
    key: '2',
    label: 'Live Duration',
  },
  {
    key: '3',
    label: 'Call Duration',
  },
  {
    key: '4',
    label: 'Remote Duration',
  },
  {
    key: '5',
    label: 'Team Member',
  }
]
const currentPage = 1
const list = { size: 10 }
const total = 100

function StatsTable({ onSort }: Props) {
  const [sortValue, setSort] = React.useState(sortItems[0].label);
  const updateRange = ({ key }: { key: string }) => {
    const item = sortItems.find((item) => item.key === key);
    setSort(item?.label || sortItems[0].label);
    item?.key && onSort(item.key)
  };
  return (
    <div className={'rounded bg-white border'}>
      <div className={'flex items-center p-4'}>
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          Assisted Sessions
        </Typography.Title>
        <div className={'ml-auto'} />
        <Dropdown menu={{ items: sortItems, onClick: updateRange }}>
          <Button size={'small'}>
            <Space>
              <Typography.Text>{sortValue}</Typography.Text>
              <DownOutlined rev={undefined} />
            </Space>
          </Button>
        </Dropdown>
      </div>
      <div className={'bg-gray-lightest grid grid-cols-8 items-center font-semibold p-4'}>
        <div className="col-span-1">Date</div>
        <div className="col-span-2">Team Members</div>
        <div className="col-span-1">Live Duration</div>
        <div className="col-span-1">Call Duration</div>
        <div className="col-span-1">Remote Duration</div>
        <div className="col-span-1" />
        <div className="col-span-1">{/*  BUTTONS */}</div>
      </div>
      <div className={'bg-white'}>
        <Row />
        <Row />
        <Row />
        <Row />
        <Row />
        <Row />
        <Row />
        <Row />
        <Row />
        <Row />
      </div>
      <div className={'flex items-center justify-between p-4'}>
        <div>
          Showing <span className="font-medium">{(currentPage - 1) * PER_PAGE + 1}</span> to{' '}
          <span className="font-medium">{(currentPage - 1) * PER_PAGE + list.size}</span> of{' '}
          <span className="font-medium">{numberWithCommas(total)}</span> sessions.
        </div>
        <Pagination
          page={1}
          totalPages={Math.ceil(100 / 10)}
          onPageChange={(page) => null}
          limit={10}
          debounceRequest={200}
        />
      </div>

    </div>
  );
}

function Row() {
  return (
    <div className={'grid grid-cols-8 p-4 border-b hover:bg-active-blue'}>
      <Cell size={1}>Date</Cell>
      <Cell size={2}>Team Members</Cell>
      <Cell size={1}>Live Duration</Cell>
      <Cell size={1}>Call Duration</Cell>
      <Cell size={1}>Remote Duration</Cell>
      <Cell size={1} />
      <Cell size={1} isReversed>
        <CloudDownloadOutlined rev={undefined} style={{ fontSize: 22, color: '#8C8C8C' }} />
        <PlayLink isAssist={false} viewed={false} sessionId={'asdasdsad'} />
      </Cell>
    </div>
  )
}

function Cell({ size, children, isReversed }: { size: number, isReversed?: boolean, children?: React.ReactNode }) {
  return (
    <div className={`col-span-${size}${isReversed ? ' flex justify-end gap-4' : ''}`}>
      {children}
    </div>
  )
}

export default StatsTable;

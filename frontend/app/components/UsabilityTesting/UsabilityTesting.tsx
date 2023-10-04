import React from 'react';
import { numberWithCommas } from 'App/utils';
import {Button, Input, Typography, Tag, Avatar, Modal, Space} from 'antd';
import { Loader, Pagination } from 'UI';
import { checkForRecent, getDateFromMill } from 'App/date';
import { UnorderedListOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useHistory, useParams } from 'react-router-dom';
import { withSiteId, usabilityTestingEdit } from 'App/routes';

const { Search } = Input;

const PER_PAGE = 10;

function TestsTable() {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const isLoading = false;
  const list = [1, 2, 3, 4, 5, 6];
  const page = 1;
  const onPageChange = () => null;
  const total = 20;

  // @ts-ignore
  const { siteId } = useParams();
  const history = useHistory();

  const onOk = () => {
    setIsModalVisible(false);
    redirect();
  }

  const openModal = () => {
    setIsModalVisible(true);
  }

  const redirect = () => {
    history.push(withSiteId(usabilityTestingEdit('123'), siteId))
  }

  return (
    <>
      <Modal title="Create Usability Test" open={isModalVisible} onOk={onOk} onCancel={onOk} footer={
        <Button type={"primary"} onClick={onOk}>
          <Space align={'center'}>
          Continue
          <ArrowRightOutlined rev={undefined} />
          </Space>
        </Button>
      }>
        <Typography.Text strong>
          Name this user test
        </Typography.Text>
        <Input placeholder="E.g. Checkout user journey evaluation" style={{ marginBottom: '2em' }}/>
        <Typography.Text strong>
          Test Objective (optional)
        </Typography.Text>
        <Input.TextArea placeholder="Share a brief statement about what you aim to discover through this study." />
      </Modal>
    <div className={'rounded bg-white border'}>
      <div className={'flex items-center p-4 gap-2'}>
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          Usability Tests
        </Typography.Title>
        <div className={'ml-auto'} />
        <Button
          type="primary"
          onClick={openModal}
        >
          Create Usability Test
        </Button>
        <Search
          placeholder="Filter by title"
          allowClear
          classNames={{ input: '!border-0 focus:!border-0' }}
          onSearch={() => null}
          style={{ width: 200 }}
        />
      </div>
      <div className={'bg-gray-lightest grid grid-cols-8 items-center font-semibold p-4'}>
        <div className="col-span-4">Test Title</div>
        <div className="col-span-1">Created by</div>
        <div className="col-span-1">Visibility</div>
        <div className="col-span-1">Creation Date</div>
        <div className="col-span-1">Status</div>
      </div>
      <div className={'bg-white'}>
        <Loader loading={isLoading} style={{ height: 300 }}>
          {list.map(() => (
            <Row />
          ))}
        </Loader>
      </div>
      <div className={'flex items-center justify-between p-4'}>
        {isLoading || list?.length === 0 ? null : (
          <>
            <div>
              Showing <span className="font-medium">{(page - 1) * PER_PAGE + 1}</span> to{' '}
              <span className="font-medium">{(page - 1) * PER_PAGE + list.length}</span> of{' '}
              <span className="font-medium">{numberWithCommas(total)}</span> sessions.
            </div>
            <Pagination
              page={page}
              totalPages={Math.ceil(100 / 10)}
              onPageChange={onPageChange}
              limit={10}
              debounceRequest={200}
            />
          </>
        )}
      </div>
    </div>
      </>
  );
}

function Row() {
  return (
    <div className={'grid grid-cols-8 p-4 border-b hover:bg-active-blue'}>
      <Cell size={4}>
        <div className={'flex items-center gap-2'}>
          <Avatar size={'large'} icon={<UnorderedListOutlined rev={undefined} />} />
          <div>
            <div className={'link'}>Very long title and add a description after</div>
            <div className={'text-disabled-text'}>
              Description is also long but not very much long but yes
            </div>
          </div>
        </div>
      </Cell>
      <Cell size={1}>This cell will have an author</Cell>
      <Cell size={1}>Team or solo</Cell>
      <Cell size={1}>{checkForRecent(getDateFromMill(+new Date())!, 'LLL dd, yyyy, hh:mm a')}</Cell>
      <Cell size={1}>
        <Tag color="orange">Kinda progress</Tag>
      </Cell>
    </div>
  );
}

function Cell({ size, children }: { size: number; children?: React.ReactNode }) {
  return <div className={`col-span-${size}`}>{children}</div>;
}

export default TestsTable;

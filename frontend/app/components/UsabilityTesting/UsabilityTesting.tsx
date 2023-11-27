import { UxTest, UxTListEntry } from "App/services/UxtestingService";
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Button, Input, Typography, Tag, Avatar, Modal, Space } from 'antd';
import AnimatedSVG from 'Shared/AnimatedSVG';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Loader, NoContent, Pagination, Link } from 'UI';
import { checkForRecent, getDateFromMill } from 'App/date';
import { UnorderedListOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useHistory, useParams } from 'react-router-dom';
import { withSiteId, usabilityTestingEdit, usabilityTestingView } from 'App/routes';
import { debounce } from 'App/utils';

const { Search } = Input;

const PER_PAGE = 10;

let debouncedSearch: any = () => null

function TestsTable() {
  const [newTestTitle, setNewTestTitle] = React.useState('');
  const [newTestDescription, setNewTestDescription] = React.useState('');
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const { uxtestingStore } = useStore();

  const onSearch = (value: string) => {
    uxtestingStore.setQuery(value);
    debouncedSearch()
  }

  React.useEffect(() => {
    uxtestingStore.getList();
    debouncedSearch = debounce(uxtestingStore.getList, 500)
  }, []);

  const onPageChange = (page: number) => {
    uxtestingStore.setPage(page);
    uxtestingStore.getList();
  };

  // @ts-ignore
  const { siteId } = useParams();
  const history = useHistory();

  const onClose = (confirmed: boolean) => {
    if (confirmed) {
      uxtestingStore.initNewTest(newTestTitle, newTestDescription);
      setNewTestDescription('');
      setNewTestTitle('');
      redirect('new');
    }
    setIsModalVisible(false);
  };

  const openModal = () => {
    setIsModalVisible(true);
  };

  const redirect = (path: string) => {
    history.push(withSiteId(usabilityTestingEdit(path), siteId));
  };

  return (
    <>
      <Modal
        title="Create Usability Test"
        open={isModalVisible}
        onOk={() => onClose(true)}
        onCancel={() => onClose(false)}
        footer={
          <Button type={'primary'} onClick={() => onClose(true)}>
            <Space align={'center'}>
              Continue
              <ArrowRightOutlined rev={undefined} />
            </Space>
          </Button>
        }
      >
        <Typography.Text strong>Name this user test</Typography.Text>
        <Input
          placeholder="E.g. Checkout user journey evaluation"
          style={{ marginBottom: '2em' }}
          value={newTestTitle}
          onChange={(e) => setNewTestTitle(e.target.value)}
        />
        <Typography.Text strong>Test Objective (optional)</Typography.Text>
        <Input.TextArea
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
          placeholder="Share a brief statement about what you aim to discover through this study."
        />
      </Modal>

      <div className={'rounded bg-white border'}>
        <div className={'flex items-center p-4 gap-2'}>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Usability Tests
          </Typography.Title>
          <div className={'ml-auto'} />
          <Button type="primary" onClick={openModal}>
            Create Usability Test
          </Button>
          <Search
            placeholder="Filter by title"
            allowClear
            classNames={{ input: '!border-0 focus:!border-0' }}
            onChange={(v) => onSearch(v.target.value)}
            onSearch={onSearch}
            style={{ width: 200 }}
          />
        </div>
        <div className={'bg-gray-lightest grid grid-cols-8 items-center font-semibold p-4'}>
          <div className="col-span-4">Test Title</div>
          <div className="col-span-1">Created by</div>
          <div className="col-span-2">Updated at</div>
          <div className="col-span-1">Status</div>
        </div>
        <div className={'bg-white'}>
          <Loader loading={uxtestingStore.isLoading} style={{ height: 300 }}>
            <NoContent
              show={uxtestingStore.total === 0}
              title={
                <div className={'flex flex-col items-center justify-center'}>
                  <AnimatedSVG name={ICONS.NO_FFLAGS} size={285} />
                  <div className="text-center text-gray-600 mt-4">
                    {uxtestingStore.searchQuery === ''
                      ? "You haven't created any user tests yet"
                      : 'No matching results'}
                  </div>
                </div>
              }
            >
              {uxtestingStore.tests.map((test) => (
                <Row test={test} />
              ))}
            </NoContent>
          </Loader>
        </div>
        <div className={'flex items-center justify-between p-4'}>
          {uxtestingStore.isLoading || uxtestingStore.tests?.length === 0 ? null : (
            <>
              <div>
                Showing{' '}
                <span className="font-medium">{(uxtestingStore.page - 1) * PER_PAGE + 1}</span> to{' '}
                <span className="font-medium">
                  {(uxtestingStore.page - 1) * PER_PAGE + uxtestingStore.tests.length}
                </span>{' '}
                of <span className="font-medium">{numberWithCommas(uxtestingStore.total)}</span>{' '}
                tests.
              </div>
              <Pagination
                page={uxtestingStore.page}
                totalPages={Math.ceil(uxtestingStore.total / 10)}
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

const statusMap = {
  preview: "Preview",
  'in-progress': "In progress",
  paused: "Paused",
  completed: "Completed",
}

function Row({ test }: { test: UxTListEntry }) {
  const link = usabilityTestingView(test.testId.toString())
  return (
    <div className={'grid grid-cols-8 p-4 border-b hover:bg-active-blue'}>
      <Cell size={4}>
        <div className={'flex items-center gap-2'}>
          <Avatar size={'large'} icon={<UnorderedListOutlined rev={undefined} />} />
          <div>
            <Link className='link' to={link}>
              {test.title}
            </Link>
            <div className={'text-disabled-text'}>
              {test.description}
            </div>
          </div>
        </div>
      </Cell>
      <Cell size={1}>{test.createdBy.name}</Cell>
      <Cell size={2}>{checkForRecent(getDateFromMill(test.updatedAt)!, 'LLL dd, yyyy, hh:mm a')}</Cell>
      <Cell size={1}>
        <Tag color={test.status === 'in-progress' ? "orange" : ''}>{statusMap[test.status]}</Tag>
      </Cell>
    </div>
  );
}

function Cell({ size, children }: { size: number; children?: React.ReactNode }) {
  return <div className={`col-span-${size}`}>{children}</div>;
}

export default observer(TestsTable);

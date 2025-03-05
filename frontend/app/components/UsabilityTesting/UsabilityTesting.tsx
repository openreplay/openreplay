import React from 'react';
import { UxTListEntry } from 'App/services/UxtestingService';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { numberWithCommas, debounce } from 'App/utils';
import { Button, Input, Typography, Tag, Modal, Space } from 'antd';
import AnimatedSVG from 'Shared/AnimatedSVG';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Loader, NoContent, Pagination, Link, Icon } from 'UI';
import { checkForRecent, getDateFromMill } from 'App/date';
import { ArrowRightOutlined, PlusOutlined } from '@ant-design/icons';
import { useHistory, useParams } from 'react-router-dom';
import {
  withSiteId,
  usabilityTestingEdit,
  usabilityTestingView,
} from 'App/routes';
import withPageTitle from 'HOCs/withPageTitle';
import { useTranslation } from 'react-i18next';

const { Search } = Input;

const PER_PAGE = 10;

let debouncedSearch: any = () => null;
const defaultDescription =
  "To assess how easy it is to use [Feature Name], we'll look at how users interact with it, how efficient it is, and if they're happy using it.";

function TestsTable() {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [newTestTitle, setNewTestTitle] = React.useState('');
  const [newTestDescription, setNewTestDescription] =
    React.useState(defaultDescription);
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const { uxtestingStore } = useStore();

  const onSearch = (value: string) => {
    uxtestingStore.setQuery(value);
    debouncedSearch();
  };

  React.useEffect(() => {
    uxtestingStore.getList();
    debouncedSearch = debounce(uxtestingStore.getList, 500);
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
      uxtestingStore.initNewTest(newTestTitle, newTestDescription, siteId);
      setNewTestDescription('');
      setNewTestTitle('');
      redirect('new');
    }
    setIsModalVisible(false);
  };

  const openModal = () => {
    setIsModalVisible(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const redirect = (path: string) => {
    history.push(withSiteId(usabilityTestingEdit(path), siteId));
  };

  return (
    <div className="w-full mx-auto" style={{ maxWidth: '1360px' }}>
      <Modal
        title={t('Create Usability Test')}
        open={isModalVisible}
        onOk={() => onClose(true)}
        onCancel={() => onClose(false)}
        footer={
          <Button
            type="primary"
            disabled={newTestTitle.trim().length === 0}
            onClick={() => onClose(true)}
          >
            <Space align="center">
              {t('Continue')}
              <ArrowRightOutlined rev={undefined} />
            </Space>
          </Button>
        }
      >
        <Typography.Text strong>{t('Title')}</Typography.Text>
        <Input
          autoFocus
          // @ts-ignore
          ref={inputRef}
          placeholder="E.g. Checkout user journey evaluation"
          style={{ marginBottom: '2em' }}
          value={newTestTitle}
          type="text"
          onChange={(e) => setNewTestTitle(e.target.value)}
        />
        <Typography.Text strong>
          {t('Test Objective (optional)')}
        </Typography.Text>
        <Input.TextArea
          rows={6}
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
          placeholder="Share a brief statement about what you aim to discover through this study."
        />
      </Modal>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex items-center p-4 gap-2">
          <h1 style={{ marginBottom: 0 }} className="text-2xl capitalize-first">
            {t('Usability Tests')}
          </h1>
          <div className="ml-auto" />
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
            {t('Create Usability Test')}
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

        <Loader loading={uxtestingStore.isLoading} style={{ height: 300 }}>
          <NoContent
            show={uxtestingStore.total === 0}
            title={
              <div className="flex flex-col items-center justify-center mt-10">
                {uxtestingStore.searchQuery === '' ? (
                  <AnimatedSVG name={ICONS.NO_UXT} size={172} />
                ) : (
                  <AnimatedSVG name={ICONS.NO_RESULTS} size={60} />
                )}
                <div className="text-lg font-medium mt-4">
                  {uxtestingStore.searchQuery === ''
                    ? 'Uncover real user insights through usability tests'
                    : 'No matching results'}
                </div>
                <div className="text-center text-gray-600">
                  {uxtestingStore.searchQuery === ''
                    ? 'Conduct summative usability testing to observe task completion and iterate your product.'
                    : ''}
                </div>
              </div>
            }
          >
            <div className="bg-gray-lightest grid grid-cols-8 items-center font-semibold p-4">
              <div className="col-span-4">{t('Test Title')}</div>
              <div className="col-span-1">{t('Created by')}</div>
              <div className="col-span-2">{t('Updated at')}</div>
              <div className="col-span-1">{t('Status')}</div>
            </div>
            <div className="bg-white">
              {uxtestingStore.tests.map((test) => (
                <Row test={test} siteId={siteId} />
              ))}
            </div>
          </NoContent>
        </Loader>
        <div className="flex items-center justify-between p-4">
          {uxtestingStore.isLoading ||
          uxtestingStore.tests?.length === 0 ? null : (
            <>
              <div>
                {t('Showing')}{' '}
                <span className="font-medium">
                  {(uxtestingStore.page - 1) * PER_PAGE + 1}
                </span>{' '}
                {t('to')}{' '}
                <span className="font-medium">
                  {(uxtestingStore.page - 1) * PER_PAGE +
                    uxtestingStore.tests.length}
                </span>{' '}
                {t('of')}{' '}
                <span className="font-medium">
                  {numberWithCommas(uxtestingStore.total)}
                </span>{' '}
                {t('tests.')}
              </div>
              <Pagination
                page={uxtestingStore.page}
                total={uxtestingStore.total}
                onPageChange={onPageChange}
                limit={10}
                debounceRequest={200}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const statusMap = {
  preview: 'Draft',
  'in-progress': 'Ongoing',
  paused: 'On Hold',
  closed: 'Closed',
};

function Row({ test, siteId }: { test: UxTListEntry; siteId: string }) {
  const link = usabilityTestingView(test.testId.toString());
  const editLink = usabilityTestingEdit(test.testId.toString());
  const history = useHistory();

  const redirect = () => {
    history.push(
      withSiteId(test.status === 'preview' ? editLink : link, siteId),
    );
  };
  return (
    <div
      className="grid grid-cols-8 p-4 border-b hover:bg-active-blue cursor-pointer"
      onClick={redirect}
    >
      <Cell size={4}>
        <div className="flex items-center gap-2">
          <div style={{ minWidth: 40 }}>
            <div
              className="rounded-full bg-tealx-light flex items-center justify-center"
              style={{ width: 40, height: 40 }}
            >
              <Icon name="list-ul" color="tealx" size={20} />
            </div>
          </div>
          <div style={{ maxWidth: 550 }} className="cap-first">
            <Link
              className="link !p-0"
              to={test.status === 'preview' ? editLink : link}
            >
              {test.title}
            </Link>
            <div className="w-11/12 text-sm whitespace-nowrap text-ellipsis overflow-hidden">
              {test.description}
            </div>
          </div>
        </div>
      </Cell>
      <Cell size={1}>{test.createdBy.name}</Cell>
      <Cell size={2}>
        {checkForRecent(
          getDateFromMill(test.updatedAt)!,
          'LLL dd, yyyy, hh:mm a',
        )}
      </Cell>
      <Cell size={1}>
        <Tag
          className="text-base rounded-lg"
          bordered={false}
          color={colors[test.status]}
        >
          {statusMap[test.status]}
        </Tag>
      </Cell>
    </div>
  );
}

const colors = {
  'in-progress': 'green',
  closed: '',
  paused: 'orange',
  preview: 'geekblue',
} as const;

function Cell({
  size,
  children,
}: {
  size: number;
  children?: React.ReactNode;
}) {
  return <div className={`col-span-${size}`}>{children}</div>;
}

export default withPageTitle('Usability Tests')(observer(TestsTable));

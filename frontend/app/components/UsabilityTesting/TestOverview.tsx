import { durationFormatted } from 'App/date';
import usePageTitle from "App/hooks/usePageTitle";
import { numberWithCommas } from 'App/utils';
import { getPdf2 } from 'Components/AssistStats/pdfGenerator';
import { useModal } from 'Components/Modal';
import React from 'react';
import { Button, Typography, Select, Space, Popover, Dropdown } from 'antd';
import { withSiteId, usabilityTesting, usabilityTestingEdit } from 'App/routes';
import { useParams, useHistory } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import {
  EditOutlined,
  ShareAltOutlined,
  ArrowRightOutlined,
  MoreOutlined,
  UserOutlined,
  UserDeleteOutlined,
  CheckCircleOutlined,
  FastForwardOutlined,
  PauseCircleOutlined,
  StopOutlined,
  HourglassOutlined,
  FilePdfOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import SessionItem from 'Shared/SessionItem';
import { Loader, NoContent, Pagination } from 'UI';
import copy from 'copy-to-clipboard';
import { Stage } from 'Components/Funnels/FunnelWidget/FunnelWidget';
import { confirm } from 'UI';
import ResponsesOverview from './ResponsesOverview';

const { Option } = Select;

const statusItems = [
  { value: 'preview', label: 'Preview', icon: <HourglassOutlined rev={undefined} /> },
  { value: 'in-progress', label: 'In Progress', icon: <HourglassOutlined rev={undefined} /> },
  { value: 'paused', label: 'Pause', icon: <PauseCircleOutlined rev={undefined} /> },
  { value: 'closed', label: 'End Testing', icon: <StopOutlined rev={undefined} /> },
];

const menuItems = [
  {
    key: '1',
    label: 'Download Results',
    icon: <FilePdfOutlined rev={undefined} />,
  },
  {
    key: '2',
    label: 'Edit',
    icon: <EditOutlined rev={undefined} />,
  },
  {
    key: '3',
    label: 'Delete',
    icon: <DeleteOutlined rev={undefined} />,
  },
];

function TestOverview() {
  // @ts-ignore
  const { siteId, testId } = useParams();
  const { showModal } = useModal();
  const { uxtestingStore } = useStore();
  usePageTitle(`Usability Tests | ${uxtestingStore.instance?.title || ''}`);

  React.useEffect(() => {
    uxtestingStore.getTest(testId);
  }, [testId]);


  if (!uxtestingStore.instance) {
    return <Loader loading={uxtestingStore.isLoading}>No data.</Loader>;
  }

  const onPageChange = (page: number) => {
    uxtestingStore.setSessionsPage(page);
  };

  return (
    <div className="w-full mx-auto" style={{ maxWidth: '1360px'}}>
      <Breadcrumb
        items={[
          {
            label: 'Usability Testing',
            to: withSiteId(usabilityTesting(), siteId),
          },
          {
            label: uxtestingStore.instance.title,
          },
        ]}
      />
      <div className={'rounded border bg-white'} id={'pdf-anchor'}>
        <Title testId={testId} siteId={siteId} />
        {uxtestingStore.instance.liveCount ? (
          <div className={'p-4 flex items-center gap-2'}>
            <div className={'relative h-4 w-4'}>
              <div className={'absolute w-4 h-4 animate-ping bg-red rounded-full opacity-75'} />
              <div className={'absolute w-4 h-4 bg-red rounded-full'} />
            </div>
            <Typography.Text>
              {uxtestingStore.instance.liveCount} participants are engaged in this usability test at
              the moment.
            </Typography.Text>
            <Button>
              <Space align={'center'}>
                Moderate Real-Time
                <ArrowRightOutlined rev={undefined} />
              </Space>
            </Button>
          </div>
        ) : null}
      </div>
      <ParticipantOverview />
      <TaskSummary />


      <div className={'mt-2 rounded border p-4 bg-white flex gap-2 items-center'}>
        <Typography.Title style={{ marginBottom: 0 }} level={5}>
          Open-ended task responses
        </Typography.Title>
        {uxtestingStore.instance.responsesCount ? (
          <Button onClick={() => showModal(<ResponsesOverview />, { right: true, width: 900 })}>
            <Space align={'center'}>
              Review All {uxtestingStore.instance.responsesCount} Responses
              <ArrowRightOutlined rev={undefined} />
            </Space>
          </Button>
        ) : (
          <Typography.Text>0 at the moment.</Typography.Text>
        )}
      </div>

      <div className={'mt-2 rounded border p-4 bg-white flex gap-1 items-start flex-col'}>
        <Typography.Title style={{ marginBottom: 0 }} level={5}>
          Sessions
        </Typography.Title>
        {/*<Typography.Text>in your selection</Typography.Text>*/}
        {/*<div className={'flex gap-1 link'}>clear selection</div>*/}
        <div className={'flex flex-col w-full'}>
          <Loader loading={uxtestingStore.isLoading}>
            <NoContent show={uxtestingStore.testSessions.list.length == 0} title="No data">
              {uxtestingStore.testSessions.list.map((session) => (
                // @ts-ignore
                <SessionItem session={session} query={'?utx=true'} />
              ))}
              <div className={'flex items-center justify-between'}>
                <div>
                  Showing{' '}
                  <span className="font-medium">
                    {(uxtestingStore.testSessions.page - 1) * 10 + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {(uxtestingStore.page - 1) * 10 + uxtestingStore.testSessions.list.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">
                    {numberWithCommas(uxtestingStore.testSessions.total)}
                  </span>{' '}
                  tests.
                </div>
                <Pagination
                  page={uxtestingStore.testSessions.page}
                  totalPages={Math.ceil(uxtestingStore.testSessions.total / 10)}
                  onPageChange={onPageChange}
                  limit={10}
                  debounceRequest={200}
                />
              </div>
            </NoContent>
          </Loader>
        </div>
      </div>
    </div>
  );
}

const ParticipantOverview = observer(() => {
  const { uxtestingStore } = useStore();

  return (
    <div className={'p-4 rounded border bg-white mt-2'}>
      <Typography.Title level={5}>Participant Overview</Typography.Title>
      {uxtestingStore.testStats ? (
        <div className={'flex gap-2'}>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <UserOutlined style={{ fontSize: 18, color: '#394EFF' }} rev={undefined} />
              <Typography.Text strong>Total Participants</Typography.Text>
            </div>
            <Typography.Title level={5}>
              {uxtestingStore.testStats.tests_attempts}
            </Typography.Title>
          </div>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <CheckCircleOutlined style={{ fontSize: 18, color: '#389E0D' }} rev={undefined} />
              <Typography.Text strong>Completed all tasks</Typography.Text>
            </div>
            <div className={'flex items-center gap-2'}>
              {uxtestingStore.testStats.tests_attempts > 0 ? (
                <Typography.Title level={5}>
                  {Math.round(
                    (uxtestingStore.testStats.completed_all_tasks /
                      uxtestingStore.testStats.tests_attempts) *
                    100
                  )}
                  %
                </Typography.Title>
              ) : null}
              <Typography.Text>{uxtestingStore.testStats.completed_all_tasks}</Typography.Text>
            </div>
          </div>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <FastForwardOutlined style={{ fontSize: 18, color: '#874D00' }} rev={undefined} />
              <Typography.Text strong>Skipped tasks</Typography.Text>
            </div>
            <div className={'flex items-center gap-2'}>
              {uxtestingStore.testStats.tests_attempts > 0 ? (
                <Typography.Title level={5}>
                  {Math.round(
                    (uxtestingStore.testStats.tasks_skipped /
                      uxtestingStore.testStats.tests_attempts) *
                    100
                  )}
                  %
                </Typography.Title>
              ) : null}
              <Typography.Text>{uxtestingStore.testStats.tasks_skipped}</Typography.Text>
            </div>
          </div>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <UserDeleteOutlined style={{ fontSize: 18, color: '#CC0000' }} rev={undefined} />
              <Typography.Text strong>Aborted the test</Typography.Text>
            </div>
            <div className={'flex items-center gap-2'}>
              {uxtestingStore.testStats.tests_attempts > 0 ? (
                <Typography.Title level={5}>
                  {Math.round(
                    (uxtestingStore.testStats.tests_skipped /
                      uxtestingStore.testStats.tests_attempts) *
                    100
                  )}
                  %
                </Typography.Title>
              ) : null}
              <Typography.Text>{uxtestingStore.testStats.tests_skipped}</Typography.Text>
            </div>
          </div>
          <div className={'flex-1'} />
        </div>
      ) : null}
    </div>
  )
})

const TaskSummary = observer(() => {
  const { uxtestingStore } = useStore();
  return (
    <div className={'mt-2 rounded border p-4 bg-white'}>
      <div className={'flex justify-between items-center'}>
        <Typography.Title level={5}>Task Summary</Typography.Title>

        {uxtestingStore.taskStats.length ? (
          <div className={'p-2 rounded bg-teal-light flex items-center gap-1'}>
            <Typography.Text>Average completion time for all tasks:</Typography.Text>
            <Typography.Text strong>
              {uxtestingStore.taskStats
                ? durationFormatted(
                  uxtestingStore.taskStats.reduce(
                    (stats, task) => stats + task.avgCompletionTime,
                    0
                  ) / uxtestingStore.taskStats.length
                )
                : null}
            </Typography.Text>
            <ClockCircleOutlined rev={undefined} />
          </div>
        ) : null}
      </div>
      {!uxtestingStore.taskStats.length ? <NoContent show title={'No data'} /> : null}
      {uxtestingStore.taskStats.map((tst, index) => (
        <Stage stage={tst} uxt index={index + 1} />
      ))}
    </div>
  )
})

const Title = observer(({ testId, siteId }: any) => {
  const { uxtestingStore } = useStore();
  const history = useHistory();

  const handleChange = (value: string) => {
    uxtestingStore.updateTestStatus(value);
  };

  const onMenuClick = async ({ key }: any) => {
    if (key === '1') {
      void getPdf2();
    }
    if (key === '2') {
      await redirectToEdit();
    }
    if (key === '3') {
      if (
        await confirm({
          confirmation:
            'Are you sure you want to delete this usability test? This action cannot be undone.',
        })
      ) {
        uxtestingStore.deleteTest(testId).then(() => {
          history.push(withSiteId(usabilityTesting(), siteId));
        });
      }
    }
  };
  const redirectToEdit = async () => {
    if (
      await confirm({
        confirmation:
          'This test already has responses, making edits at this stage may result in confusing outcomes.',
        confirmButton: 'Edit',
      })
    ) {
      history.push(withSiteId(usabilityTestingEdit(testId), siteId));
    }
  };

  return (
    <div className={'p-4 flex items-center gap-2 border-b'}>
      <div>
        <Typography.Title level={4}>{uxtestingStore.instance!.title}</Typography.Title>
        <div className={'text-disabled-text'}>{uxtestingStore.instance!.description}</div>
      </div>
      <div className={'ml-auto'} />
      <Select
        value={uxtestingStore.instance!.status}
        style={{ width: 150 }}
        onChange={handleChange}
      >
        {statusItems.map((item) => (
          <Option key={item.value} value={item.value} label={item.label}>
            <Space align={'center'}>
              {item.icon} {item.label}
            </Space>
          </Option>
        ))}
      </Select>
      <Button type={'primary'} onClick={redirectToEdit}>
        <Space align={'center'}>
          {uxtestingStore.instance!.tasks.length} Tasks <EditOutlined rev={undefined} />{' '}
        </Space>
      </Button>
      <Popover
        trigger={'click'}
        title={'Participants Link'}
        content={
          <div style={{ width: '220px' }}>
            <div className={'p-2 bg-white rounded border break-all mb-2'}>
              {`${uxtestingStore.instance!.startingPath}?oruxt=${
                uxtestingStore.instance!.testId
              }`}
            </div>
            <Button
              onClick={() => {
                copy(
                  `${uxtestingStore.instance!.startingPath}?oruxt=${
                    uxtestingStore.instance!.testId
                  }`
                );
              }}
            >
              Copy
            </Button>
          </div>
        }
      >
        <Button type={'primary'} ghost>
          <Space align={'center'}>
            Distribute
            <ShareAltOutlined rev={undefined} />
          </Space>
        </Button>
      </Popover>
      <Dropdown menu={{ items: menuItems, onClick: onMenuClick }}>
        <Button ghost type={'primary'} icon={<MoreOutlined rev={undefined} />}></Button>
      </Dropdown>
    </div>
  )
})
export default observer(TestOverview);

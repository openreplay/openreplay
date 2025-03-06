import { durationFormatted } from 'App/date';
import { numberWithCommas } from 'App/utils';
import { getPdf2 } from 'Components/AssistStats/pdfGenerator';
import { useModal } from 'Components/Modal';
import LiveTestsModal from 'Components/UsabilityTesting/LiveTestsModal';
import React from 'react';
import {
  Button,
  Typography,
  Select,
  Space,
  Popover,
  Dropdown,
  Tooltip,
} from 'antd';
import {
  InfoCircleOutlined,
  EditOutlined,
  ShareAltOutlined,
  ArrowRightOutlined,
  MoreOutlined,
  UserOutlined,
  UserDeleteOutlined,
  CheckCircleOutlined,
  FastForwardOutlined,
  // FilePdfOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { withSiteId, usabilityTesting, usabilityTestingEdit } from 'App/routes';
import { useParams, useHistory } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import { CopyButton, Icon, Loader, NoContent, Pagination, confirm } from 'UI';
import {
  Stage,
  EmptyStage,
} from 'Components/Funnels/FunnelWidget/FunnelWidget';
import ParticipantOverviewItem from 'Components/UsabilityTesting/ParticipantOverview';
import { toast } from 'react-toastify';
import ResponsesOverview from './ResponsesOverview';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

function StatusItem({
  iconName,
  color,
  text,
  size = '16',
}: {
  iconName: string;
  color: string;
  size: string;
  text: string;
}) {
  return (
    <div className="flex items-center">
      <Icon name={iconName} color={color} size={size} />
      <Typography.Text className="ml-2">{text}</Typography.Text>
    </div>
  );
}

const statusItems = (t: TFunction) => [
  {
    value: 'in-progress',
    label: (
      <StatusItem
        iconName="record-circle-fill"
        color="green"
        text={t('On Going')}
      />
    ),
  },
  {
    value: 'paused',
    label: (
      <StatusItem
        iconName="pause-circle-fill"
        color="orange-dark"
        text={t('Hold')}
      />
    ),
  },
  {
    value: 'closed',
    label: (
      <StatusItem
        iconName="check-circle-fill"
        color="gray-medium"
        text={t('Close')}
      />
    ),
  },
];

const colors = {
  'in-progress': '#52c41a',
  closed: '#bfbfbf',
  paused: '#fa8c16',
  preview: '#2f54eb',
};

const menuItems = [
  // {
  //   key: '1',
  //   label: 'Download Results',
  //   icon: <FilePdfOutlined rev={undefined} />,
  // },
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
  const { t } = useTranslation();
  const { siteId, testId } = useParams();
  const { showModal, hideModal } = useModal();
  const history = useHistory();
  const { uxtestingStore } = useStore();

  React.useEffect(() => {
    const getData = async () => {
      try {
        await uxtestingStore.getTest(testId);
      } catch {
        history.push(withSiteId(usabilityTesting(), siteId));
      }
    };

    void getData();
  }, [testId, siteId]);

  if (!uxtestingStore.instance) {
    return (
      <Loader loading={uxtestingStore.isLoading}>{t('Loading Data...')}</Loader>
    );
  }
  document.title = `Usability Tests | ${uxtestingStore.instance.title}`;

  const onPageChange = (page: number) => {
    uxtestingStore.setSessionsPage(page);
  };

  return (
    <div
      className="w-full mx-auto"
      style={{ maxWidth: '1360px' }}
      id="pdf-anchor"
    >
      <Breadcrumb
        items={[
          {
            label: t('Usability Testing'),
            to: withSiteId(usabilityTesting(), siteId),
          },
          {
            label: uxtestingStore.instance.title,
          },
        ]}
      />
      <div className="rounded-lg shadow-sm bg-white">
        <Title testId={testId} siteId={siteId} />

        {uxtestingStore.instance.liveCount ? (
          <div className="p-4 flex items-center gap-2">
            <div className="relative h-4 w-4">
              <div className="absolute w-4 h-4 animate-ping bg-green rounded-full opacity-75" />
              <div className="absolute w-4 h-4 bg-green rounded-full" />
            </div>
            <Typography.Text>
              {uxtestingStore.instance.liveCount}{' '}
              {t(
                'participants are engaged in this usability test at the moment.',
              )}
            </Typography.Text>
            <Button
              type="primary"
              ghost
              onClick={() => {
                showModal(
                  <LiveTestsModal closeModal={hideModal} testId={testId} />,
                  {
                    right: true,
                    width: 900,
                  },
                );
              }}
            >
              <Space align="center">
                {t('Moderate Real-Time')}
                <ArrowRightOutlined rev={undefined} />
              </Space>
            </Button>
          </div>
        ) : null}
      </div>

      <ParticipantOverview />

      <TaskSummary />

      <div className="mt-2 rounded-lg shadow-sm p-4 bg-white flex flex-col gap-2">
        <Typography.Title style={{ marginBottom: 0 }} level={5}>
          {t('Open-ended task responses')}
        </Typography.Title>
        {uxtestingStore.instance.responsesCount ? (
          <Button
            type="primary"
            ghost
            disabled={uxtestingStore.instance.responsesCount === 0}
            onClick={() =>
              showModal(<ResponsesOverview />, { right: true, width: 900 })
            }
          >
            <Space align="center">
              {t('Review All')}&nbsp;{uxtestingStore.instance.responsesCount}
              &nbsp;{t('Responses')}
              <ArrowRightOutlined rev={undefined} />
            </Space>
          </Button>
        ) : (
          <div className="text-base flex gap-2 mx-auto py-5">
            <InfoCircleOutlined />
            &nbsp;{t('No Data')}
          </div>
        )}
      </div>

      <div className="mt-2 rounded-lg shadow-sm p-4 bg-white flex gap-1 items-start flex-col">
        <Typography.Title style={{ marginBottom: 0 }} level={5}>
          {t('Sessions')}
        </Typography.Title>
        {/* <Typography.Text>in your selection</Typography.Text> */}
        {/* <div className={'flex gap-1 link'}>clear selection</div> */}
        <div className="flex flex-col w-full">
          <Loader loading={uxtestingStore.isLoading}>
            <NoContent
              show={uxtestingStore.testSessions.list.length == 0}
              title={
                <div className="text-base flex gap-2">
                  <InfoCircleOutlined />
                  &nbsp;{t('No Data')}
                </div>
              }
            >
              {uxtestingStore.testSessions.list.map((session) => (
                // @ts-ignore
                <SessionItem session={session} query="?uxt=true" />
              ))}
              <div className="flex items-center justify-between">
                <div>
                  {t('Showing')}{' '}
                  <span className="font-medium">
                    {(uxtestingStore.testSessions.page - 1) * 10 + 1}
                  </span>{' '}
                  {t('to')}{' '}
                  <span className="font-medium">
                    {(uxtestingStore.page - 1) * 10 +
                      uxtestingStore.testSessions.list.length}
                  </span>{' '}
                  {t('of')}{' '}
                  <span className="font-medium">
                    {numberWithCommas(uxtestingStore.testSessions.total)}
                  </span>{' '}
                  {t('tests.')}
                </div>
                <Pagination
                  page={uxtestingStore.testSessions.page}
                  total={uxtestingStore.testSessions.total}
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
  const { t } = useTranslation();
  const { uxtestingStore } = useStore();

  return (
    <div className="p-4 rounded-lg shadow-sm bg-white mt-2">
      <Typography.Title level={5}>{t('Participant Overview')}</Typography.Title>
      {uxtestingStore.testStats ? (
        <div className="flex gap-4">
          <ParticipantOverviewItem
            titleRow={
              <>
                <UserOutlined
                  style={{ fontSize: 18, color: '#394EFF' }}
                  rev={undefined}
                />
                <Typography.Text className="font-medium">
                  {t('Total Participants')}
                </Typography.Text>
              </>
            }
            firstNum={uxtestingStore.testStats.tests_attempts?.toString()}
          />
          <ParticipantOverviewItem
            titleRow={
              <>
                <CheckCircleOutlined
                  style={{ fontSize: 18, color: '#389E0D' }}
                  rev={undefined}
                />
                <Typography.Text className="font-medium">
                  {t('Completed all tasks')}
                </Typography.Text>
              </>
            }
            firstNum={
              uxtestingStore.testStats.tests_attempts > 0
                ? `${Math.round(
                    (uxtestingStore.testStats.completed_all_tasks /
                      uxtestingStore.testStats.tests_attempts) *
                      100,
                  )}%`
                : undefined
            }
            addedNum={uxtestingStore.testStats.completed_all_tasks.toString()}
          />
          <ParticipantOverviewItem
            titleRow={
              <>
                <FastForwardOutlined
                  style={{ fontSize: 18, color: '#874D00' }}
                  rev={undefined}
                />
                <Typography.Text className="font-medium">
                  {t('Skipped tasks')}
                </Typography.Text>
              </>
            }
            firstNum={
              uxtestingStore.testStats.tests_attempts > 0
                ? `${Math.round(
                    (uxtestingStore.testStats.tasks_skipped /
                      uxtestingStore.testStats.tests_attempts) *
                      100,
                  )}%`
                : undefined
            }
            addedNum={uxtestingStore.testStats.tasks_skipped.toString()}
          />
          <ParticipantOverviewItem
            titleRow={
              <>
                <UserDeleteOutlined
                  style={{ fontSize: 18, color: '#CC0000' }}
                  rev={undefined}
                />
                <Typography.Text className="font-medium">
                  {t('Aborted the test')}
                </Typography.Text>
              </>
            }
            firstNum={
              uxtestingStore.testStats.tests_attempts > 0
                ? `${Math.round(
                    (uxtestingStore.testStats.tests_skipped /
                      uxtestingStore.testStats.tests_attempts) *
                      100,
                  )}%`
                : undefined
            }
            addedNum={uxtestingStore.testStats.tests_skipped.toString()}
          />
        </div>
      ) : null}
    </div>
  );
});

const TaskSummary = observer(() => {
  const { t } = useTranslation();
  const { uxtestingStore } = useStore();
  const [showAll, setShowAll] = React.useState(false);
  const totalAttempts = uxtestingStore.testStats?.tests_attempts ?? 0;
  const shouldHide = uxtestingStore.taskStats.length > 5;
  const shownTasks = shouldHide
    ? showAll
      ? uxtestingStore.taskStats
      : uxtestingStore.taskStats.slice(0, 5)
    : uxtestingStore.taskStats;

  return (
    <div className="mt-2 rounded-lg shadow-sm p-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <Typography.Title level={5}>{t('Task Summary')}</Typography.Title>

        {uxtestingStore.taskStats.length ? (
          <div className="p-2 rounded-lg bg-indigo-50  flex items-center gap-1 px-4">
            <ClockCircleOutlined rev={undefined} />
            <Typography.Text>
              {t('Average completion time of all tasks:')}
            </Typography.Text>
            <Typography.Text strong>
              {uxtestingStore.taskStats
                ? durationFormatted(
                    uxtestingStore.taskStats.reduce(
                      (stats, task) => stats + task.avgCompletionTime,
                      0,
                    ) / uxtestingStore.taskStats.length,
                  )
                : null}
            </Typography.Text>
          </div>
        ) : null}
      </div>
      {!uxtestingStore.taskStats.length ? (
        <NoContent
          show
          title={
            <div className="text-base flex gap-2">
              <InfoCircleOutlined />
              &nbsp;{t('No Data')}
            </div>
          }
        />
      ) : null}
      {shownTasks.map((tst, index) => (
        <Stage
          stage={{
            ...tst,
            isActive: true,
            skipped: tst.skipped || totalAttempts - tst.completed,
          }}
          uxt
          index={index + 1}
        />
      ))}
      {shouldHide && !showAll ? (
        <div className="cursor-pointer" onClick={() => setShowAll(true)}>
          <EmptyStage total={uxtestingStore.taskStats.length - 5} />
        </div>
      ) : null}
    </div>
  );
});

const Title = observer(({ testId, siteId }: any) => {
  const { t } = useTranslation();
  const [truncate, setTruncate] = React.useState(true);
  const { uxtestingStore } = useStore();
  const history = useHistory();

  const handleChange = (value: string) => {
    uxtestingStore.updateTestStatus(value);
    switch (value) {
      case 'in-progress':
        toast.success(
          t(
            'The test is now live. Use the distribution link to share it with participants.',
          ),
        );
        break;
      case 'paused':
        toast.success(
          t(
            "The test is on 'Hold'—participant activity paused. Toggle back to “ongoing” to resume activity.",
          ),
        );
        break;
      case 'closed':
        toast.success(t('The test is complete and closed.'));
        break;
    }
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
          confirmation: t(
            'Are you sure you want to delete this usability test? This action cannot be undone.',
          ),
        })
      ) {
        uxtestingStore.deleteTest(testId).then(() => {
          history.push(withSiteId(usabilityTesting(), siteId));
        });
      }
    }
  };

  if (!uxtestingStore.instance) {
    return null;
  }

  const truncatedDescr =
    uxtestingStore.instance?.description &&
    uxtestingStore.instance.description.length > 250 &&
    truncate
      ? `${uxtestingStore.instance?.description.substring(0, 250)}...`
      : uxtestingStore.instance?.description;
  const redirectToEdit = async () => {
    const confirmationTitle =
      uxtestingStore.instance!.status === 'in-progress'
        ? t('Editing Active Usability Test')
        : t('Editing Test on Hold');
    const confirmationStr =
      uxtestingStore.instance!.status === 'in-progress'
        ? t(
            "You're editing a test that's currently active. Please be aware that you can only modify the test title and objective. Editing test steps is not permitted to avoid confusion with existing responses. Proceed with caution! 🚧",
          )
        : t(
            'This usability test is on hold. You can only update the title and descriptions. Task editing is not allowed to avoid confusion with existing responses.',
          );
    if (
      await confirm({
        header: confirmationTitle,
        confirmation: confirmationStr,
        confirmButton: t('Edit'),
      })
    ) {
      history.push(withSiteId(usabilityTestingEdit(testId), siteId));
    }
  };

  // @ts-ignore
  const getColor = (status) => colors[status];

  const isActive = ['in-progress', 'preview'].includes(
    uxtestingStore.instance!.status,
  );
  return (
    <div className="p-4 border-b">
      <div className="flex items-center gap-2">
        <Typography.Title level={4} className="cap-first">
          {uxtestingStore.instance!.title}
        </Typography.Title>
        <div className="ml-auto" />
        <Select
          className="utStatusToggler"
          value={uxtestingStore.instance!.status}
          style={{ width: 150 }}
          onChange={handleChange}
          options={statusItems(t)}
          optionRender={(item) => <Space align="center">{item.label}</Space>}
        />
        {/* <Button
          disabled={uxtestingStore.instance!.status === 'closed'}
          type={'primary'}
          ghost
          onClick={redirectToEdit}
        >
          <Space align={'center'}>
            {uxtestingStore.instance!.tasks.length} Tasks <EditOutlined rev={undefined} />{' '}
          </Space>
        </Button> */}
        {isActive ? (
          <Popover
            trigger="hover"
            placement="bottomRight"
            className="rounded-lg"
            content={
              <div style={{ width: '300px' }}>
                <div className="text-base font-medium">
                  {t(
                    'Distribute the following link with test participants via email or other methods.',
                  )}
                </div>
                <div
                  style={{ background: '#E4F6F6' }}
                  className="p-2 rounded-lg break-all my-2 text-lg"
                >
                  {`${uxtestingStore.instance!.startingPath}?oruxt=${
                    uxtestingStore.instance!.testId
                  }`}
                </div>
                <CopyButton
                  variant="text-primary"
                  content={`${uxtestingStore.instance!.startingPath}?oruxt=${
                    uxtestingStore.instance!.testId
                  }`}
                />
              </div>
            }
          >
            <Button type="primary">
              <Space align="center">
                {t('Distribute Test')}
                <ShareAltOutlined rev={undefined} />
              </Space>
            </Button>
          </Popover>
        ) : null}
        <Dropdown
          menu={{
            items:
              uxtestingStore.instance!.status === 'closed'
                ? menuItems.filter((i) => i.label !== 'Edit')
                : menuItems,
            onClick: onMenuClick,
          }}
        >
          <Button icon={<MoreOutlined rev={undefined} />} />
        </Dropdown>
      </div>
      <div className="whitespace-pre-wrap mt-2 cap-first">{truncatedDescr}</div>
      {uxtestingStore.instance?.description &&
      uxtestingStore.instance.description.length > 250 ? (
        <div className="link" onClick={() => setTruncate(!truncate)}>
          {truncate ? 'Show more' : 'Show less'}
        </div>
      ) : null}
    </div>
  );
});

export default observer(TestOverview);

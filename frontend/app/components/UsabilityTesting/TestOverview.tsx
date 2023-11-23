import { useModal } from 'Components/Modal';
import { Step } from 'Components/UsabilityTesting/TestEdit';
import React from 'react';
import { Button, Typography, Select, Space, Popover, Dropdown, Input, Switch } from 'antd';
import { withSiteId, usabilityTesting } from 'App/routes';
import { useParams } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { observer } from 'mobx-react-lite';
import { useStore } from "App/mstore";
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
  DownOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Loader, Pagination } from "UI";

const { Option } = Select;

const items = [
  { value: 'in_progress', label: 'In Progress', icon: <HourglassOutlined rev={undefined} /> },
  { value: 'pause', label: 'Pause', icon: <PauseCircleOutlined rev={undefined} /> },
  { value: 'ended', label: 'End Testing', icon: <StopOutlined rev={undefined} /> },
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

const handleChange = (value: string) => {
  console.log(`selected ${value}`);
};

function TestOverview() {
  // @ts-ignore
  const { siteId, testId } = useParams();
  const { showModal, hideModal } = useModal();
  const { uxtestingStore } = useStore();

  React.useEffect(() => {
    uxtestingStore.getTest(testId);
  }, [testId])

  if (!uxtestingStore.instance) {
    return <Loader loading={uxtestingStore.isLoading}>
      No data.
    </Loader>
  }

  return (
    <>
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
      <div className={'rounded border bg-white'}>
        <div className={'p-4 flex items-center gap-2 border-b'}>
          <div>
            <Typography.Title level={4}>{uxtestingStore.instance.title}</Typography.Title>
            <div className={'text-disabled-text'}>
              {uxtestingStore.instance.description}
            </div>
          </div>
          <div className={'ml-auto'} />
          <Select defaultValue="in_progress" style={{ width: 150 }} onChange={handleChange}>
            {items.map((item) => (
              <Option key={item.value} value={item.value} label={item.label}>
                <Space align={'center'}>
                  {item.icon} {item.label}
                </Space>
              </Option>
            ))}
          </Select>
          <Button type={'primary'}>
            <Space align={'center'}>
              5 Tasks <EditOutlined rev={undefined} />{' '}
            </Space>
          </Button>
          <Popover
            trigger={'click'}
            title={'Participants Link'}
            content={
              <div style={{ width: '220px' }}>
                <div className={'p-2 bg-white rounded border break-all mb-2'}>
                  https://openreplay.company.com/UTID128738?rjs
                </div>
                <Button>Copy</Button>
              </div>
            }
          >
            <Button>
              <Space align={'center'}>
                Distribute
                <ShareAltOutlined rev={undefined} />
              </Space>
            </Button>
          </Popover>
          <Dropdown menu={{ items: menuItems }}>
            <Button icon={<MoreOutlined rev={undefined} />}></Button>
          </Dropdown>
        </div>
        <div className={'p-4 flex items-center gap-2'}>
          <div className={'relative h-4 w-4'}>
            <div className={'absolute w-4 h-4 animate-ping bg-red rounded-full opacity-75'} />
            <div className={'absolute w-4 h-4 bg-red rounded-full'} />
          </div>
          <Typography.Text>
            15 participants are engaged in this usability test at the moment.
          </Typography.Text>
          <Button>
            <Space align={'center'}>
              Moderate Real-Time
              <ArrowRightOutlined rev={undefined} />
            </Space>
          </Button>
        </div>
      </div>
      <div className={'p-4 rounded border bg-white mt-2'}>
        <Typography.Title level={5}>Participant Overview</Typography.Title>
        <div className={'flex gap-2'}>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <UserOutlined style={{ fontSize: 18, color: '#394EFF' }} rev={undefined} />
              <Typography.Text strong>Total Participants</Typography.Text>
            </div>
            <Typography.Title level={5}>12,864</Typography.Title>
          </div>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <CheckCircleOutlined style={{ fontSize: 18, color: '#389E0D' }} rev={undefined} />
              <Typography.Text strong>Completed all tasks</Typography.Text>
            </div>
            <Typography.Title level={5}>12,864</Typography.Title>
          </div>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <FastForwardOutlined style={{ fontSize: 18, color: '#874D00' }} rev={undefined} />
              <Typography.Text strong>Skipped tasks</Typography.Text>
            </div>
            <Typography.Title level={5}>12,864</Typography.Title>
          </div>
          <div className={'rounded border p-2 flex-1'}>
            <div className={'flex items-center gap-2'}>
              <UserDeleteOutlined style={{ fontSize: 18, color: '#CC0000' }} rev={undefined} />
              <Typography.Text strong>Aborted the test</Typography.Text>
            </div>
            <Typography.Title level={5}>12,864</Typography.Title>
          </div>
          <div className={'flex-1'} />
        </div>
      </div>

      <div className={'mt-2 rounded border p-4 bg-white'}>
        <div className={'flex justify-between items-center'}>
          <Typography.Title level={5}>Task Summary</Typography.Title>

          <div className={'p-2 rounded bg-tealx-light flex items-center gap-1'}>
            <Typography.Text>Average completion time for all tasks:</Typography.Text>
            <Typography.Text strong>1min49sec</Typography.Text>
            <ClockCircleOutlined rev={undefined} />
          </div>
        </div>
      </div>

      <div className={'mt-2 rounded border p-4 bg-white flex gap-2 items-center'}>
        <Typography.Title style={{ marginBottom: 0 }} level={5}>
          Open-ended task responses
        </Typography.Title>
        <Button onClick={() => showModal(<ResponsesOverview />, { right: true, width: 900 })}>
          <Space align={'center'}>
            Review All 10,186 Responses
            <ArrowRightOutlined rev={undefined} />
          </Space>
        </Button>
      </div>

      <div className={'mt-2 rounded border p-4 bg-white flex gap-1 items-center'}>
        <Typography.Title style={{ marginBottom: 0 }} level={5}>
          Sessions
        </Typography.Title>
        <Typography.Text>in your selection</Typography.Text>
        <div className={'flex gap-1 link'}>clear selection</div>
      </div>
    </>
  );
}

function ResponsesOverview() {
  return (
    <div style={{ width: 900 }} className={'h-screen p-4 bg-white flex flex-col gap-4'}>
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        Open-ended task responses
      </Typography.Title>
      <div className={'flex flex-col gap-1'}>
        <Typography.Text strong>Select Task / Question</Typography.Text>
        <Step
          buttons={
            <div className={'self-center'}>
              <Button icon={<DownOutlined rev={undefined} />} size={'small'} />
            </div>
          }
        />
      </div>
      <div className={'grid grid-cols-9 border-b'}>
        <div className={'col-span-1'}>
          <Typography.Text strong># Response</Typography.Text>
        </div>
        <div className={'col-span-2'}>
          <Typography.Text strong>Participant</Typography.Text>
        </div>
        <div className={'col-span-6'}>
          <Typography.Text strong>Response (add search text)</Typography.Text>
        </div>
      </div>
      <div className={'grid grid-cols-9 border-b'}>
        <div className={'col-span-1'}>1</div>
        <div className={'col-span-2'}>Nikita Melnikov</div>
        <div className={'col-span-6'}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.
        </div>
      </div>
      <div className={'p-2 flex items-center justify-between'}>
        <div className={'text-disabled-text'}>Showing 1-123 of 123123 responses</div>
        <Pagination page={1} totalPages={2} onPageChange={() => null} />
      </div>
    </div>
  );
}

export default observer(TestOverview);

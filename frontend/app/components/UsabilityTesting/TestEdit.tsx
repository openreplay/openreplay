import { Button, Input, Typography } from 'antd';
import React from 'react';
import { withSiteId, usabilityTesting } from 'App/routes';
import { useParams } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

function TestEdit() {
  // @ts-ignore
  const { siteId } = useParams();

  return (
    <>
      <Breadcrumb
        items={[
          {
            label: 'Usability Testing',
            to: withSiteId(usabilityTesting(), siteId),
          },
          {
            label: 'Test name goes here',
          },
          {
            label: 'Edit',
          },
        ]}
      />
      <div className={'grid grid-cols-4 gap-2'}>
      <div className={'flex w-full flex-col gap-2 col-span-3'}>
        <div className={'flex items-start p-4 rounded bg-white border justify-between'}>
          <div>
            <Typography.Title level={4}>Test name goes here</Typography.Title>
            <Typography.Text>Test description goes here</Typography.Text>
          </div>
          <div>
            <Button>Edit</Button>
          </div>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Starting point</Typography.Text>
          <Input
            addonBefore={'https://funnywebsite.com'}
            style={{ width: 400 }}
            placeholder={'Think about placeholder'}
          />
          <Typography.Text>Test will begin on this page</Typography.Text>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Introduction & Guidelines</Typography.Text>
          <Typography.Text>
            Provide an overview of this user test to and input guidelines that can be of assistance
            to users at any point during the test.
          </Typography.Text>
          <div>
            <Button>Add</Button>
          </div>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Task List</Typography.Text>
          <Step />
          <Step />
          <div>
            <Button>Add a task or question</Button>
          </div>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Conclusion Message</Typography.Text>
          <div>
            <Button>Edit</Button>
          </div>
        </div>
      </div>
      <SidePanel />
      </div>
    </>
  );
}

function SidePanel() {
  return (
    <div className={'flex flex-col gap-2 col-span-1'}>
      <div className={'p-4 bg-white rounded border flex flex-col'}>
        <Typography.Text strong>Participant Requirements</Typography.Text>
        <Typography.Text>Mic</Typography.Text>
        <Typography.Text>Camera</Typography.Text>
      </div>

      <Button>Preview</Button>
      <Button type={"primary"}>Publish Test</Button>
    </div>
  )
}

function Step() {
  return (
    <div className={'p-4 rounded border bg-active-blue flex items-start gap-2'}>
      <div className={'w-6 h-6 bg-white rounded-full border flex items-center justify-center'}>
        1
      </div>

      <div>
        <Typography.Text>Add more steps here</Typography.Text>
        <div className={'text-disabled-text'}>And then write description of the step here</div>
      </div>

      <div className={'ml-auto'} />
      <Button icon={<EditOutlined rev={undefined} />} />
      <Button icon={<DeleteOutlined rev={undefined} />} />
    </div>
  );
}

export default TestEdit;

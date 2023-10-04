import { Button, Input, Typography } from 'antd';
import React from 'react';
import { withSiteId } from 'App/routes';
import { useParams } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';

function TestEdit() {
  // @ts-ignore
  const { siteId } = useParams();

  return (
    <>
      <Breadcrumb
        items={[
          {
            label: 'Usability Testing',
            to: withSiteId('/alerts', siteId),
          },
          {
            label: 'Test name goes here',
          },
          {
            label: 'Edit',
          },
        ]}
      />
      <div className={'flex w-full flex-col gap-2'}>
        <div className={'flex items-start p-4 rounded bg-white border justify-between'}>
          <div>
            <Typography.Title level={4}>Test name goes here</Typography.Title>
            <Typography.Text>Test description goes here</Typography.Text>
          </div>
          <Button>Edit</Button>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Starting point</Typography.Text>
          <Input addonBefore={'https://funnywebsite.com'} style={{ width: 400 }} placeholder={'Think about placeholder'} />
          <Typography.Text>Test will begin on this page</Typography.Text>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Introduction & Guidelines</Typography.Text>
          <Typography.Text>
            Provide an overview of this user test to and input guidelines that can be of assistance
            to users at any point during the test.
          </Typography.Text>
          <Button>Add</Button>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Task List</Typography.Text>
          <Button>Add a task or question</Button>
        </div>

        <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
          <Typography.Text strong>Conclusion Message</Typography.Text>
          <Button>Edit</Button>
        </div>
      </div>
    </>
  );
}

export default TestEdit;

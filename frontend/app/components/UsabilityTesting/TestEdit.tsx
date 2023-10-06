import {Button, Input, Typography, Switch, Space} from 'antd';
import React from 'react';
import { withSiteId, usabilityTesting } from 'App/routes';
import { useParams } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import { useModal } from 'App/components/Modal';

function TestEdit() {
  const [conclusionMessage, setConclusionMessage] = React.useState('');
  const [isConclusionEditing, setIsConclusionEditing] = React.useState(false);
  const [overview, setOverview] = React.useState('');
  const [isOverviewEditing, setIsOverviewEditing] = React.useState(false);
  // @ts-ignore
  const { siteId } = useParams();
  const { showModal, hideModal } = useModal();

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
              <Button>Edit icon</Button>
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>Starting point</Typography.Text>
            <Input
              addonBefore={'https://funnywebsite.com/'}
              style={{ width: 400 }}
              placeholder={'Think about placeholder'}
            />
            <Typography.Text>Test will begin on this page</Typography.Text>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>Introduction & Guidelines</Typography.Text>
            <Typography.Text></Typography.Text>
            {isOverviewEditing ? (
              <Input.TextArea
                placeholder={'Task overview'}
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
              />
            ) : (
              <Typography.Text>
                {overview.length
                  ? overview
                  : 'Provide an overview of this user test to and input guidelines that can be of assistance to users at any point during the test.'}
              </Typography.Text>
            )}
            <div className={'flex gap-2'}>
              {isOverviewEditing ? (
                <>
                  <Button type={'primary'} onClick={() => setIsOverviewEditing(false)}>
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setOverview('');
                      setIsOverviewEditing(false);
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsOverviewEditing(true)}>Add</Button>
              )}
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>Task List</Typography.Text>
            <Step />
            <Step />
            <div>
              <Button onClick={() => showModal(<StepsModal />, { right: true })}>
                Add a task or question
              </Button>
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>Conclusion Message</Typography.Text>
            <div>
              {isConclusionEditing ? (
                <Input.TextArea
                  placeholder={'Thanks for participation!..'}
                  value={conclusionMessage}
                  onChange={(e) => setConclusionMessage(e.target.value)}
                />
              ) : (
                <Typography.Text>{conclusionMessage}</Typography.Text>
              )}
            </div>
            <div className={'flex gap-2'}>
              {isConclusionEditing ? (
                <>
                  <Button type={'primary'} onClick={() => setIsConclusionEditing(false)}>
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setConclusionMessage('');
                      setIsConclusionEditing(false);
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsConclusionEditing(true)}>Edit</Button>
              )}
            </div>
          </div>
        </div>
        <SidePanel />
      </div>
    </>
  );
}

function StepsModal() {
  return (
    <div className={'h-screen p-4 bg-white flex flex-col gap-4'}>
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        Add a task or question
      </Typography.Title>
      <div className={'flex flex-col gap-1 items-start'}>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Title/Question
        </Typography.Title>
        <Input placeholder={'Think about placeholder'} />
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Instruction
        </Typography.Title>
        <Input.TextArea placeholder={'Think about placeholder'} />
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Allow participants to type an answer
        </Typography.Title>
        <Switch checkedChildren="Yes" unCheckedChildren="No" />
        <div className={'text-disabled-text'}>
          Enabling this option will show a text field for participants to type their answer.
        </div>
      </div>
      <div className={'flex gap-2'}>
        <Button type={'primary'}>Add</Button>
        <Button>Cancel</Button>
      </div>
    </div>
  );
}

function SidePanel() {
  return (
    <div className={'flex flex-col gap-2 col-span-1'}>
      <div className={'p-4 bg-white rounded border flex flex-col gap-2'}>
        <Typography.Text strong>Participant Requirements</Typography.Text>
        <div className={'flex justify-between'}>
          <Typography.Text>Mic</Typography.Text>
          <Switch checkedChildren="Yes" unCheckedChildren="No" />
        </div>
        <div className={'flex justify-between'}>
          <Typography.Text>Camera</Typography.Text>
          <Switch checkedChildren="Yes" unCheckedChildren="No" />
        </div>
      </div>

      <Button>
        <Space align={'center'}>
          Preview <ExportOutlined rev={undefined} />
        </Space>
      </Button>
      <Button type={'primary'}>Publish Test</Button>
    </div>
  );
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
      <Button size={'small'} icon={<EditOutlined rev={undefined} />} />
      <Button size={'small'} icon={<DeleteOutlined rev={undefined} />} />
    </div>
  );
}

export default TestEdit;

import { Button, Input, Typography, Switch, Space } from 'antd';
import { UxTask } from 'App/services/UxtestingService';
import React from 'react';
import { withSiteId, usabilityTesting, usabilityTestingView, usabilityTestingEdit } from "App/routes";
import { useParams, useHistory } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

function TestEdit() {
  const { uxtestingStore } = useStore();
  const [isConclusionEditing, setIsConclusionEditing] = React.useState(false);
  const [isOverviewEditing, setIsOverviewEditing] = React.useState(false);
  // @ts-ignore
  const { siteId, testId } = useParams();
  const { showModal, hideModal } = useModal();
  const history = useHistory();

  React.useEffect(() => {
    if (testId && testId !== 'new') {
      uxtestingStore.getTestData(testId);
    }
  }, [])
  if (!uxtestingStore.instance) {
    return <div>Loading...</div>;
  }

  const onSave = (isPreview?: boolean) => {
    if (testId && testId !== 'new') {
      uxtestingStore.updateTest(uxtestingStore.instance!).then((testId) => {
        history.push(withSiteId(usabilityTestingView(testId!.toString()), siteId));
      })
    } else {
      uxtestingStore.createNewTest(isPreview).then((test) => {
        if (isPreview) {
          window.open(`${test.startingPath}?oruxt=${test.testId}`, '_blank', 'noopener,noreferrer');
          history.push(withSiteId(usabilityTestingEdit(test.testId), siteId));
        }
        else {
          history.push(withSiteId(usabilityTestingView(test.testId), siteId));
        }
      })
    }
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
          {
            label: 'Edit',
          },
        ]}
      />
      <div className={'grid grid-cols-4 gap-2'}>
        <div className={'flex w-full flex-col gap-2 col-span-3'}>
          <div className={'flex items-start p-4 rounded bg-white border justify-between'}>
            <div>
              <Typography.Title level={4}>{uxtestingStore.instance.title}</Typography.Title>
              <Typography.Text>{uxtestingStore.instance.description}</Typography.Text>
            </div>
            <div>
              <Button>Edit icon</Button>
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>Starting point</Typography.Text>
            <Input
              style={{ width: 400 }}
              placeholder={'https://mywebsite.com/example-page'}
              value={uxtestingStore.instance!.startingPath}
              onChange={(e) => {
                uxtestingStore.instance!.setProperty('startingPath', e.target.value);
              }}
            />
            <Typography.Text>Test will begin on this page</Typography.Text>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>Introduction & Guidelines</Typography.Text>
            <Typography.Text></Typography.Text>
            {isOverviewEditing ? (
              <Input.TextArea
                placeholder={'Task overview'}
                value={uxtestingStore.instance.guidelines}
                onChange={(e) => uxtestingStore.instance!.setProperty('guidelines', e.target.value)}
              />
            ) : (
              <Typography.Text>
                {uxtestingStore.instance.guidelines.length
                  ? uxtestingStore.instance.guidelines
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
                      uxtestingStore.instance!.setProperty('guidelines', '');
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
            {uxtestingStore.instance!.tasks.map((task, index) => (
              <Step
                ind={index}
                title={task.title}
                description={task.description}
                buttons={
                  <>
                    <Button size={'small'} icon={<EditOutlined rev={undefined} />} />
                    <Button
                      onClick={() => {
                        uxtestingStore.instance!.setProperty(
                          'tasks',
                          uxtestingStore.instance!.tasks.filter(
                            (t) => t.title !== task.title && t.description !== task.description
                          )
                        );
                      }}
                      size={'small'}
                      icon={<DeleteOutlined rev={undefined} />}
                    />
                  </>
                }
              />
            ))}
            <div>
              <Button
                onClick={() =>
                  showModal(
                    <StepsModal
                      onHide={hideModal}
                      onAdd={(task) => {
                        uxtestingStore.instance!.setProperty('tasks', [
                          ...uxtestingStore.instance!.tasks,
                          task,
                        ]);
                      }}
                    />,
                    { right: true }
                  )
                }
              >
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
                  value={uxtestingStore.instance!.conclusionMessage}
                  onChange={(e) =>
                    uxtestingStore.instance!.setProperty('conclusionMessage', e.target.value)
                  }
                />
              ) : (
                <Typography.Text>{uxtestingStore.instance!.conclusionMessage}</Typography.Text>
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
                      uxtestingStore.instance!.setProperty('conclusionMessage', '');
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
        <SidePanel onSave={() => onSave(false)} onPreview={() => onSave(true)} />
      </div>
    </>
  );
}

function StepsModal({ onAdd, onHide }: { onAdd: (step: UxTask) => void; onHide: () => void }) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isAnswerEnabled, setIsAnswerEnabled] = React.useState(false);

  const save = () => {
    onAdd({
      title: title,
      description: description || '',
      allow_typing: isAnswerEnabled,
    });
    onHide();
  };
  return (
    <div className={'h-screen p-4 bg-white flex flex-col gap-4'}>
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        Add a task or question
      </Typography.Title>
      <div className={'flex flex-col gap-1 items-start'}>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Title/Question
        </Typography.Title>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={'Task title'}
        />
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Instructions
        </Typography.Title>
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={'Task instructions'}
        />
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Allow participants to type an answer
        </Typography.Title>
        <Switch
          checked={isAnswerEnabled}
          onChange={(checked) => setIsAnswerEnabled(checked)}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
        <div className={'text-disabled-text'}>
          Enabling this option will show a text field for participants to type their answer.
        </div>
      </div>
      <div className={'flex gap-2'}>
        <Button type={'primary'} onClick={save}>
          Add
        </Button>
        <Button onClick={onHide}>Cancel</Button>
      </div>
    </div>
  );
}

const SidePanel = observer(({ onSave, onPreview }: any) => {
  const { uxtestingStore } = useStore();
  return (
    <div className={'flex flex-col gap-2 col-span-1'}>
      <div className={'p-4 bg-white rounded border flex flex-col gap-2'}>
        <Typography.Text strong>Participant Requirements</Typography.Text>
        <div className={'flex justify-between'}>
          <Typography.Text>Mic</Typography.Text>
          <Switch
            checked={uxtestingStore.instance!.requireMic}
            defaultChecked={uxtestingStore.instance!.requireMic}
            onChange={(checked) => uxtestingStore.instance!.setProperty('requireMic', checked)}
            checkedChildren="Yes"
            unCheckedChildren="No"
          />
        </div>
        <div className={'flex justify-between'}>
          <Typography.Text>Camera</Typography.Text>
          <Switch
            checked={uxtestingStore.instance!.requireCamera}
            defaultChecked={uxtestingStore.instance!.requireCamera}
            onChange={(checked) => uxtestingStore.instance!.setProperty('requireCamera', checked)}
            checkedChildren="Yes"
            unCheckedChildren="No"
          />
        </div>
      </div>

      <Button onClick={onPreview}>
        <Space align={'center'}>
          Preview <ExportOutlined rev={undefined} />
        </Space>
      </Button>
      <Button
        type={'primary'}
        onClick={onSave}
      >
        Publish Test
      </Button>
    </div>
  );
});

export function Step({
  buttons,
  ind,
  title,
  description,
}: {
  buttons?: React.ReactNode;
  ind: number;
  title: string;
  description: string | null;
}) {
  return (
    <div className={'p-4 rounded border bg-active-blue flex items-start gap-2'}>
      <div className={'w-6 h-6 bg-white rounded-full border flex items-center justify-center'}>
        {ind + 1}
      </div>

      <div>
        <Typography.Text>{title}</Typography.Text>
        <div className={'text-disabled-text'}>{description}</div>
      </div>

      <div className={'ml-auto'} />
      {buttons}
    </div>
  );
}

export default observer(TestEdit);

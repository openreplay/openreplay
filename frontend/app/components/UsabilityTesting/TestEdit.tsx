import { Button, Input, Typography, Dropdown, Modal } from 'antd';
import React from 'react';
import {
  withSiteId,
  usabilityTesting,
  usabilityTestingView,
  usabilityTestingEdit,
} from 'App/routes';
import { useParams, useHistory, Prompt } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { EditOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { confirm } from 'UI';
import StepsModal from './StepsModal';
import SidePanel from './SidePanel';
import usePageTitle from 'App/hooks/usePageTitle';

const menuItems = [
  {
    key: '1',
    label: 'Edit Title and Description',
    icon: <EditOutlined rev={undefined} />,
  },
  {
    key: '2',
    label: 'Delete',
    icon: <DeleteOutlined rev={undefined} />,
  },
];

function TestEdit() {
  const [hasChanged, setHasChanged] = React.useState(false);
  const { uxtestingStore } = useStore();
  const [newTestTitle, setNewTestTitle] = React.useState('');
  const [newTestDescription, setNewTestDescription] = React.useState('');
  const [conclusion, setConclusion] = React.useState('');
  const [guidelines, setGuidelines] = React.useState('');
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [isConclusionEditing, setIsConclusionEditing] = React.useState(false);
  const [isOverviewEditing, setIsOverviewEditing] = React.useState(false);
  // @ts-ignore
  const { siteId, testId } = useParams();
  const { showModal, hideModal } = useModal();
  const history = useHistory();
  usePageTitle(`Usability Tests | ${uxtestingStore.instance ? 'Edit' : 'Create'}`);

  React.useEffect(() => {
    if (testId && testId !== 'new') {
      uxtestingStore.getTestData(testId).then((inst) => {
        if (inst) {
          setConclusion(inst.conclusionMessage || '');
          setGuidelines(inst.guidelines || '');
        }
      });
    } else {
      setConclusion(uxtestingStore.instance!.conclusionMessage)
      setGuidelines(uxtestingStore.instance!.guidelines)
    }
  }, []);
  if (!uxtestingStore.instance) {
    return <div>Loading...</div>;
  }

  const onSave = (isPreview?: boolean) => {
    if (testId && testId !== 'new') {
      uxtestingStore.updateTest(uxtestingStore.instance!).then((testId) => {
        history.push(withSiteId(usabilityTestingView(testId!.toString()), siteId));
      });
    } else {
      uxtestingStore.createNewTest(isPreview).then((test) => {
        if (isPreview) {
          window.open(`${test.startingPath}?oruxt=${test.testId}`, '_blank', 'noopener,noreferrer');
          history.push(withSiteId(usabilityTestingEdit(test.testId), siteId));
        } else {
          history.push(withSiteId(usabilityTestingView(test.testId), siteId));
        }
      });
    }
  };

  const onClose = (confirmed: boolean) => {
    if (confirmed) {
      uxtestingStore.instance!.setProperty('title', newTestTitle);
      uxtestingStore.instance!.setProperty('description', newTestDescription);
    }
    setNewTestDescription('');
    setNewTestTitle('');
    setIsModalVisible(false);
  };

  const onMenuClick = async ({ key }: { key: string }) => {
    if (key === '1') {
      setNewTestTitle(uxtestingStore.instance!.title);
      setNewTestDescription(uxtestingStore.instance!.description);
      setIsModalVisible(true);
    }
    if (key === '2') {
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

  return (
    <div className="w-full mx-auto" style={{ maxWidth: '1360px' }}>
      <Breadcrumb
        items={[
          {
            label: 'Usability Testing',
            to: withSiteId(usabilityTesting(), siteId),
          },
          {
            label: uxtestingStore.instance.title,
            to: withSiteId(usabilityTestingView(testId), siteId),
          },
          {
            label: 'Edit',
          },
        ]}
      />
      <Prompt
        when={hasChanged}
        message={() => {
          return 'You have unsaved changes. Are you sure you want to leave?';
        }}
      />
      <Modal
        title="Edit Test"
        open={isModalVisible}
        onOk={() => onClose(true)}
        onCancel={() => onClose(false)}
        footer={
          <Button type={'primary'} onClick={() => onClose(true)}>
            Save
          </Button>
        }
      >
        <Typography.Text strong>Title</Typography.Text>
        <Input
          placeholder="E.g. Checkout user journey evaluation"
          style={{ marginBottom: '2em' }}
          value={newTestTitle}
          onChange={(e) => {
            setHasChanged(true);
            setNewTestTitle(e.target.value)
          }}
        />
        <Typography.Text strong>Test Objective (optional)</Typography.Text>
        <Input.TextArea
          value={newTestDescription}
          onChange={(e) => {
            setHasChanged(true);
            setNewTestDescription(e.target.value)
          }}
          placeholder="Share a brief statement about what you aim to discover through this study."
        />
      </Modal>
      <div className={'grid grid-cols-4 gap-2'}>
        <div className={'flex w-full flex-col gap-2 col-span-3'}>
          <div className={'flex items-start p-4 rounded bg-white border justify-between'}>
            <div>
              <Typography.Title level={4}>{uxtestingStore.instance.title}</Typography.Title>
              <Typography.Text>{uxtestingStore.instance.description}</Typography.Text>
            </div>
            <div>
              <Dropdown menu={{ items: menuItems, onClick: onMenuClick }}>
                <Button icon={<MoreOutlined rev={undefined} />}></Button>
              </Dropdown>
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>🏁 Starting point</Typography.Text>
            <Input
              style={{ width: 400 }}
              type={'url'}
              placeholder={'https://mywebsite.com/example-page'}
              value={uxtestingStore.instance!.startingPath}
              onChange={(e) => {
                setHasChanged(true);
                uxtestingStore.instance!.setProperty('startingPath', e.target.value);
              }}
            />
            <Typography.Text>Test will begin on this page.</Typography.Text>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>📖 Introduction and Guidelines for Participants</Typography.Text>
            <Typography.Text></Typography.Text>
            {isOverviewEditing ? (
              <Input.TextArea
                autoFocus
                rows={5}
                placeholder={'Enter a brief introduction to the test and its goals here. Follow with clear, step-by-step guidelines for participants.'}
                value={guidelines}
                onChange={(e) => {
                  setHasChanged(true);
                  setGuidelines(e.target.value)
                }}
              />
            ) : (
              <div className={'whitespace-pre-wrap'}>
                {uxtestingStore.instance?.guidelines?.length
                  ? uxtestingStore.instance.guidelines
                  : 'Provide an overview of this usability test to and input guidelines that can be of assistance to users at any point during the test.'}
              </div>
            )}
            <div className={'flex gap-2'}>
              {isOverviewEditing ? (
                <>
                  <Button
                    type={'primary'}
                    onClick={() => {
                      uxtestingStore.instance!.setProperty('guidelines', guidelines);
                      setIsOverviewEditing(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsOverviewEditing(false);
                      setGuidelines(uxtestingStore.instance?.guidelines || '');
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type={'primary'} ghost onClick={() => setIsOverviewEditing(true)}>
                  {uxtestingStore.instance?.guidelines?.length ? 'Edit' : 'Add'}
                </Button>
              )}
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>📋 Tasks</Typography.Text>
            {uxtestingStore.instance!.tasks.map((task, index) => (
              <Step
                ind={index}
                title={task.title}
                description={task.description}
                buttons={
                  <>
                    <Button size={'small'} icon={<EditOutlined rev={undefined} />} onClick={() => {
                      showModal(
                        <StepsModal
                          editTask={task}
                          onHide={hideModal}
                          onAdd={(task) => {
                            setHasChanged(true);
                            const tasks = [...uxtestingStore.instance!.tasks];
                            tasks[index] = task;
                            uxtestingStore.instance!.setProperty('tasks', tasks);
                          }}
                        />,
                        { right: true, width: 600 }
                      )
                    }} />
                    <Button
                      onClick={() => {
                        setHasChanged(true);
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
                type={'primary'}
                ghost
                onClick={() =>
                  showModal(
                    <StepsModal
                      onHide={hideModal}
                      onAdd={(task) => {
                        setHasChanged(true);
                        uxtestingStore.instance!.setProperty('tasks', [
                          ...uxtestingStore.instance!.tasks,
                          task,
                        ]);
                      }}
                    />,
                    { right: true, width: 600 }
                  )
                }
              >
                Add a task or question
              </Button>
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Text strong>🎉 Conclusion Message</Typography.Text>
            <div>
              {isConclusionEditing ? (
                <Input.TextArea
                  placeholder={'Enter your closing remarks here, thanking participants for their time and contributions.'}
                  value={conclusion}
                  onChange={(e) => {
                    setHasChanged(true);
                    setConclusion(e.target.value)
                  }}
                />
              ) : (
                <Typography.Text>{uxtestingStore.instance!.conclusionMessage}</Typography.Text>
              )}
            </div>
            <div className={'flex gap-2'}>
              {isConclusionEditing ? (
                <>
                  <Button
                    type={'primary'}
                    onClick={() => {
                      uxtestingStore.instance!.setProperty('conclusionMessage', conclusion);
                      setIsConclusionEditing(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsConclusionEditing(false);
                      setConclusion(uxtestingStore.instance?.conclusionMessage || '');
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type={'primary'} ghost onClick={() => setIsConclusionEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
        <SidePanel
          taskLen={uxtestingStore.instance.tasks.length}
          onSave={() => onSave(false)}
          onPreview={() => onSave(true)}
        />
      </div>
    </div>
  );
}

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

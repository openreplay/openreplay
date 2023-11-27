import {
  Button,
  Input,
  Typography,
  Dropdown,
  Modal,
} from 'antd';
import React from 'react';
import {
  withSiteId,
  usabilityTesting,
  usabilityTestingView,
  usabilityTestingEdit,
} from 'App/routes';
import { useParams, useHistory } from 'react-router-dom';
import Breadcrumb from 'Shared/Breadcrumb';
import { EditOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { confirm } from 'UI';
import StepsModal from './StepsModal';
import SidePanel from './SidePanel';

const menuItems = [
  {
    key: '1',
    label: 'Change title/description',
    icon: <EditOutlined rev={undefined} />,
  },
  {
    key: '2',
    label: 'Delete',
    icon: <DeleteOutlined rev={undefined} />,
  },
];

function TestEdit() {
  const [newTestTitle, setNewTestTitle] = React.useState('');
  const [newTestDescription, setNewTestDescription] = React.useState('');
  const [isModalVisible, setIsModalVisible] = React.useState(false);
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
        console.log(test);
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
          onChange={(e) => setNewTestTitle(e.target.value)}
        />
        <Typography.Text strong>Test Objective (optional)</Typography.Text>
        <Input.TextArea
          value={newTestDescription}
          onChange={(e) => setNewTestDescription(e.target.value)}
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
                {uxtestingStore.instance?.guidelines?.length
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

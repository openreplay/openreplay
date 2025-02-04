import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { CircularLoader, Loader } from 'UI';
import { Form, Input, Button, Select } from 'antd';
import { toast } from 'react-toastify';

interface Props {
  closeHandler: () => void;
  sessionId: string;
  errors: string[];
}

const IssueForm: React.FC<Props> = observer(({ closeHandler, sessionId, errors }) => {
  const {
    issueReportingStore: {
      createLoading: creating,
      projects,
      projectsLoading,
      users,
      instance,
      metaLoading,
      issueTypes,
      saveIssue,
      init,
      editInstance: edit,
      fetchMeta,
      fetchList
    }
  } = useStore();

  useEffect(() => {
    init({
      projectId: projects[0]?.id || '',
      issueType: issueTypes[0]?.id || ''
    });
  }, []);

  useEffect(() => {
    if (instance?.projectId) {
      fetchMeta(instance.projectId).then(() => {
        edit({ issueType: '', assignee: '', projectId: instance.projectId });
      });
    }
  }, [instance?.projectId]);

  const onFinish = async () => {
    await saveIssue(sessionId, instance).then(() => {
      closeHandler();
    }).catch(() => {
      toast('Failed to create issue', { type: 'error' });
    });

    // if (!errors || errors.length === 0) {
    //   init({ projectId: instance?.projectId });
    //   fetchList(sessionId);
    //   closeHandler();
    // }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    edit({ [name]: value });
  };

  const handleSelect = (field: string) => (value: string) => {
    edit({ [field]: value });
  };

  const projectOptions = projects.map(
    ({ name, id }: { name: string; id: string }) => ({ label: name, value: id })
  );
  const userOptions = users.map(
    ({ name, id }: { name: string; id: string }) => ({ label: name, value: id })
  );
  const issueTypeOptions = issueTypes.map((opt: any) => ({
    label: opt.name,
    value: opt.id,
    iconUrl: opt.iconUrl
  }));

  return (
    <Loader loading={projectsLoading} size={40}>
      <Form onFinish={onFinish} layout="vertical" className="text-left">
        <Form.Item
          label={
            <>
              <span className="mr-2">Project</span>
              <CircularLoader loading={metaLoading} />
            </>
          }
          className="mb-15-imp"
        >
          <Select
            value={instance?.projectId}
            onChange={handleSelect('projectId')}
            placeholder="Project"
          >
            {projectOptions.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Issue Type" className="mb-15-imp">
          <Select
            value={instance?.issueType}
            onChange={handleSelect('issueType')}
            placeholder="Select issue type"
            optionLabelProp="label"
          >
            {issueTypeOptions.map((option) => (
              <Select.Option
                key={option.value}
                value={option.value}
                label={
                  <div className="flex items-center">
                    {option.iconUrl}
                    <span>{option.label}</span>
                  </div>
                }
              >
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Assignee" className="mb-15-imp">
          <Select
            value={instance?.assignee}
            onChange={handleSelect('assignee')}
            placeholder="Select a user"
          >
            {userOptions.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Summary" className="mb-15-imp">
          <Input
            name="title"
            value={instance?.title}
            placeholder="Issue Title / Summary"
            onChange={handleChange}
          />
        </Form.Item>
        <Form.Item label="Description" className="mb-15-imp">
          <Input.TextArea
            name="description"
            rows={2}
            value={instance?.description}
            placeholder="E.g. Found this issue at 3:29secs"
            onChange={handleChange}
            className="text-area"
          />
        </Form.Item>
        <Button
          loading={creating}
          disabled={!instance?.isValid}
          className="float-left mr-2"
          type="primary"
          htmlType="submit"
        >
          Create
        </Button>
        <Button onClick={closeHandler}>Cancel</Button>
      </Form>
    </Loader>
  );
});

export default IssueForm;

import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Button, CircularLoader, Form, Input, Loader } from 'UI';

import Select from 'Shared/Select';

const SelectedValue = ({ icon, text }) => {
  return (
    <div className="flex items-center">
      {icon}
      <span>{text}</span>
    </div>
  );
};

function IssueForm(props) {
  const { closeHandler } = props;
  const { issueReportingStore } = useStore();
  const creating = issueReportingStore.createLoading;
  const projects = issueReportingStore.projects;
  const projectsLoading = issueReportingStore.projectsLoading;
  const users = issueReportingStore.users;
  const instance = issueReportingStore.instance;
  const metaLoading = issueReportingStore.metaLoading;
  const issueTypes = issueReportingStore.issueTypes;
  const addActivity = issueReportingStore.saveIssue;
  const init = issueReportingStore.init;
  const edit = issueReportingStore.editInstance;
  const fetchMeta = issueReportingStore.fetchMeta;

  React.useEffect(() => {
    init({
      projectId: projects[0] ? projects[0].id : '',
      issueType: issueTypes[0] ? issueTypes[0].id : '',
    });
  }, []);

  React.useEffect(() => {
    if (instance?.projectId) {
      fetchMeta(instance?.projectId).then(() => {
        edit({
          issueType: '',
          assignee: '',
          projectId: instance?.projectId,
        });
      });
    }
  }, [instance?.projectId]);

  const onSubmit = () => {
    const { sessionId } = props;
    addActivity(sessionId, instance).then(() => {
      const { errors } = props;
      if (!errors || errors.length === 0) {
        init({ projectId: instance?.projectId });
        void issueReportingStore.fetchList(sessionId);
        closeHandler();
      }
    });
  };

  const write = (e) => {
    const {
      target: { name, value },
    } = e;
    edit({ [name]: value });
  };

  const writeOption = ({ name, value }) => edit({ [name]: value.value });
  const projectOptions = projects.map(({ name, id }) => ({
    label: name,
    value: id,
  }));
  const userOptions = users.map(({ name, id }) => ({ label: name, value: id }));

  const issueTypeOptions = issueTypes.map(({ name, id, iconUrl, color }) => {
    return { label: name, value: id, iconUrl, color };
  });

  const selectedIssueType = issueTypes.filter(
    (issue) => issue.id == instance?.issueType
  )[0];

  return (
    <Loader loading={projectsLoading} size={40}>
      <Form onSubmit={onSubmit} className="text-left">
        <Form.Field className="mb-15-imp">
          <label htmlFor="issueType" className="flex items-center">
            <span className="mr-2">Project</span>
            <CircularLoader loading={metaLoading} />
          </label>
          <Select
            name="projectId"
            options={projectOptions}
            defaultValue={instance?.projectId}
            fluid
            onChange={writeOption}
            placeholder="Project"
          />
        </Form.Field>
        <Form.Field className="mb-15-imp">
          <label htmlFor="issueType">Issue Type</label>
          <Select
            selection
            name="issueType"
            labeled
            options={issueTypeOptions}
            defaultValue={instance?.issueType}
            fluid
            onChange={writeOption}
            placeholder="Select issue type"
            text={
              selectedIssueType ? (
                <SelectedValue
                  icon={selectedIssueType.iconUrl}
                  text={selectedIssueType.name}
                />
              ) : (
                ''
              )
            }
          />
        </Form.Field>

        <Form.Field className="mb-15-imp">
          <label htmlFor="assignee">Assignee</label>
          <Select
            selection
            name="assignee"
            options={userOptions}
            fluid
            onChange={writeOption}
            placeholder="Select a user"
          />
        </Form.Field>

        <Form.Field className="mb-15-imp">
          <label htmlFor="title">Summary</label>
          <Input
            name="title"
            value={instance?.title}
            placeholder="Issue Title / Summary"
            onChange={write}
          />
        </Form.Field>

        <Form.Field className="mb-15-imp">
          <label htmlFor="description">Description</label>
          <textarea
            name="description"
            rows="2"
            value={instance?.description}
            placeholder="E.g. Found this issue at 3:29secs"
            onChange={write}
            className="text-area"
          />
        </Form.Field>

        <Button
          loading={creating}
          variant="primary"
          disabled={!instance?.isValid}
          className="float-left mr-2"
          type="submit"
        >
          {'Create'}
        </Button>
        <Button type="button" onClick={closeHandler}>
          {'Cancel'}
        </Button>
      </Form>
    </Loader>
  );
}

export default observer(IssueForm);

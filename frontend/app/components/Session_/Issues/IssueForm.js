import React from 'react';
import { connect } from 'react-redux';
import { Form, Input, Button, CircularLoader } from 'UI';
//import {  } from 'Duck/issues';
import { addActivity, init, edit, fetchAssignments, fetchMeta } from 'Duck/assignments';
import Select from 'Shared/Select';

const SelectedValue = ({ icon, text }) => {
  return (
    <div className="flex items-center">
      {/* <img className="mr-2" src={ icon } width="13" height="13" /> */}
      {icon}
      <span>{text}</span>
    </div>
  );
};

class IssueForm extends React.PureComponent {
  componentDidMount() {
    const { projects, issueTypes } = this.props;

    this.props.init({
      projectId: projects[0] ? projects[0].id : '',
      issueType: issueTypes[0] ? issueTypes[0].id : '',
    });
  }

  componentWillReceiveProps(newProps) {
    const { instance } = this.props;
    if (instance.projectId && newProps.instance.projectId != instance.projectId) {
      this.props.fetchMeta(instance.projectId).then(() => {
        this.props.edit({ issueType: '', assignee: '', projectId: newProps.instance.projectId });
      });
    }
  }

  onSubmit = () => {
    const { sessionId, addActivity } = this.props;
    const { instance } = this.props;

    addActivity(sessionId, instance.toJS()).then(() => {
      const { errors } = this.props;
      if (!errors || errors.length === 0) {
        this.props.init({ projectId: instance.projectId });
        this.props.fetchAssignments(sessionId);
        this.props.closeHandler();
      }
    });
  };

  write = (e) => {
    const {
      target: { name, value },
    } = e;
    this.props.edit({ [name]: value });
  };
  writeOption = ({ name, value }) => this.props.edit({ [name]: value.value });

  render() {
    const { creating, projects, users, issueTypes, instance, closeHandler, metaLoading } =
      this.props;
    const projectOptions = projects.map(({ name, id }) => ({ label: name, value: id })).toArray();
    const userOptions = users.map(({ name, id }) => ({ label: name, value: id })).toArray();

    const issueTypeOptions = issueTypes.map(({ name, id, iconUrl, color }) => {
      return { label: name, value: id, iconUrl, color };
    });

    const selectedIssueType = issueTypes.filter((issue) => issue.id == instance.issueType)[0];

    return (
      <Form onSubmit={this.onSubmit} className="text-left">
        <Form.Field className="mb-15-imp">
          <label htmlFor="issueType">
            <span className="mr-2">Project</span>
            <CircularLoader loading={metaLoading} />
          </label>
          <Select
            name="projectId"
            options={projectOptions}
            // value={ instance.projectId }
            fluid
            onChange={this.writeOption}
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
            // value={ instance.issueType }
            fluid
            onChange={this.writeOption}
            placeholder="Select issue type"
            text={
              selectedIssueType ? (
                <SelectedValue icon={selectedIssueType.iconUrl} text={selectedIssueType.name} />
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
            // value={ instance.assignee }
            fluid
            onChange={this.writeOption}
            placeholder="Select a user"
          />
        </Form.Field>

        <Form.Field className="mb-15-imp">
          <label htmlFor="title">Summary</label>
          <Input
            name="title"
            value={instance.title}
            placeholder="Issue Title / Summary"
            onChange={this.write}
          />
        </Form.Field>

        <Form.Field className="mb-15-imp">
          <label htmlFor="description">
            Description
            {/* <span className="text-sm text-gray-500">(Optional)</span> */}
          </label>
          <textarea
            name="description"
            rows="2"
            value={instance.description}
            placeholder="E.g. Found this issue at 3:29secs"
            onChange={this.write}
          />
        </Form.Field>

        <Button
          loading={creating}
          variant="primary"
          disabled={!instance.validate()}
          className="float-left mr-2"
          type="submit"
        >
          {'Create'}
        </Button>
        <Button type="button" onClick={closeHandler}>
          {'Cancel'}
        </Button>
      </Form>
    );
  }
}

export default connect(
  (state) => ({
    creating: state.getIn(['assignments', 'addActivity', 'loading']),
    projects: state.getIn(['assignments', 'projects']),
    users: state.getIn(['assignments', 'users']),
    instance: state.getIn(['assignments', 'instance']),
    metaLoading: state.getIn(['assignments', 'fetchMeta', 'loading']),
    issueTypes: state.getIn(['assignments', 'issueTypes']),
    errors: state.getIn(['assignments', 'addActivity', 'errors']),
  }),
  { addActivity, init, edit, fetchAssignments, fetchMeta }
)(IssueForm);

import { Button, Tooltip } from 'antd';
import { connect } from 'react-redux';
import React from 'react';
import { useStore } from 'App/mstore';
import { Icon, Popover } from 'UI';
import IssuesModal from './IssuesModal';

function Issues(props) {
  const { issueReportingStore } = useStore();

  const handleOpen = () => {
    issueReportingStore.init();
    if (!issueReportingStore.projectsFetched) {
      issueReportingStore.fetchProjects().then((projects) => {
        if (projects && projects[0]) {
          void issueReportingStore.fetchMeta(projects[0].id);
        }
      });
    }
  };

  const { sessionId, issuesIntegration } = props;
  const provider = issuesIntegration?.first().provider || '';

  return (
    <Popover
      onOpen={handleOpen}
      render={({ close }) => (
        <div>
          <IssuesModal
            provider={provider}
            sessionId={sessionId}
            closeHandler={close}
          />
        </div>
      )}
    >
      <div>
        <Tooltip title={'Create Issue'} placement="bottom">
          <Button size={'small'} className={'flex items-center justify-center'}>
            <Icon
              name={`integrations/${provider ?? 'github'}`}
            />
          </Button>
        </Tooltip>
      </div>
    </Popover>
  );
}

export default connect((state) => ({
  issuesIntegration: state.getIn(['issues', 'list']) || {},
  issuesFetched: state.getIn(['issues', 'issuesFetched']),
}))(Issues);
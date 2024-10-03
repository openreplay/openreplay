import { Button, Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useStore } from 'App/mstore';
import { Icon, Popover } from 'UI';
import IssuesModal from './IssuesModal';

function Issues(props) {
  const { issueReportingStore } = useStore();
  const issuesIntegration = issueReportingStore.list

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

  const { sessionId } = props;
  const provider = issuesIntegration[0]?.provider || '';
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
              name={`integrations/${provider === 'jira' ? 'jira' : 'github'}`}
            />
          </Button>
        </Tooltip>
      </div>
    </Popover>
  );
}

export default observer(Issues);

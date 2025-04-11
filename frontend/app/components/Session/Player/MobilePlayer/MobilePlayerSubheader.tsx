import React, { useMemo } from 'react';
import QueueControls from 'Components/Session_/QueueControls';
import Bookmark from 'Shared/Bookmark';
import Issues from 'Components/Session_/Issues/Issues';
import { Tag, Tooltip, Button as AntButton } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import ShareModal from 'Shared/SharePopup/SharePopup';
import { useModal } from 'Components/ModalContext';
import { PlayerContext } from 'Components/Session/playerContext';
import HighlightButton from 'Components/Session_/Highlight/HighlightButton';
import IssueForm from 'Components/Session_/Issues/IssueForm';
import { useTranslation } from 'react-i18next';

interface Props {
  setActiveTab: (tab: string) => void;
  sessionId: string;
}

function SubHeader(props: Props) {
  const { t } = useTranslation();
  const { sessionStore, integrationsStore, issueReportingStore } = useStore();
  const integrations = integrationsStore.issues.list;
  const isIOS = sessionStore.current.platform === 'ios';
  const { openModal, closeModal } = useModal();
  const { store } = React.useContext(PlayerContext);
  const currentSession = sessionStore.current;

  const enabledIntegration = useMemo(() => {
    if (!integrations || !integrations.length) {
      return false;
    }

    return integrations.some((i: Record<string, any>) => i.token);
  }, [integrations]);

  const handleOpenIssueModal = () => {
    issueReportingStore.init({});
    if (!issueReportingStore.projectsFetched) {
      issueReportingStore.fetchProjects().then((projects) => {
        if (projects && projects[0]) {
          void issueReportingStore.fetchMeta(projects[0].id);
        }
      });
    }
    openModal(
      <IssueForm
        sessionId={currentSession.sessionId}
        closeHandler={closeModal}
        errors={[]}
      />,
      {
        title: 'Create Issue',
      },
    );
  };

  return (
    <div className="w-full px-4 flex items-center border-b relative">
      <Tag color="green" bordered={false} className="rounded-full">
        {isIOS ? 'iOS' : 'Android'} BETA
      </Tag>
      <div
        className="ml-auto text-sm flex items-center color-gray-medium gap-2"
        style={{ width: 'max-content' }}
      >
        <HighlightButton onClick={() => props.setActiveTab('HIGHLIGHT')} />
        {enabledIntegration && <Issues sessionId={props.sessionId} />}
        <Bookmark sessionId={props.sessionId} />
        <Tooltip title={t('Share Session')} placement="bottom">
          <AntButton
            size="small"
            className="flex items-center justify-center"
            onClick={() =>
              openModal(
                <ShareModal
                  showCopyLink
                  hideModal={closeModal}
                  time={store?.get().time}
                />,
                { title: t('Share Session') },
              )
            }
          >
            <ShareAltOutlined />
          </AntButton>
        </Tooltip>

        <div>
          {/* @ts-ignore */}
          <QueueControls />
        </div>
      </div>
    </div>
  );
}

export default observer(SubHeader);

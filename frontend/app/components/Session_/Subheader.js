import React from 'react';
import { Icon } from 'UI';
import Autoplay from './Autoplay';
import Bookmark from 'Shared/Bookmark';
import SharePopup from '../shared/SharePopup/SharePopup';
import copy from 'copy-to-clipboard';
import { Tooltip } from 'react-tippy';
import Issues from './Issues/Issues';
import NotePopup from './components/NotePopup';
import { connectPlayer, pause } from 'Player';
import ItemMenu from './components/HeaderMenu';
import { useModal } from 'App/components/Modal';
import BugReportModal from './BugReport/BugReportModal';

function SubHeader(props) {
  const [isCopied, setCopied] = React.useState(false);
  const { showModal, hideModal } = useModal();
  const isAssist = window.location.pathname.includes('/assist/');

  const location =
    props.currentLocation && props.currentLocation.length > 60
      ? `${props.currentLocation.slice(0, 60)}...`
      : props.currentLocation;

  const showReportModal = () => {
    pause();
    showModal(<BugReportModal width={props.width} height={props.height} hideModal={hideModal} />, { right: true });
  };

  return (
    <div className="w-full px-4 py-2 flex items-center border-b">
      {location && (
        <div
          className="flex items-center cursor-pointer color-gray-medium text-sm p-1 hover:bg-gray-light-shade rounded-md"
          onClick={() => {
            copy(props.currentLocation);
            setCopied(true);
            setTimeout(() => setCopied(false), 5000);
          }}
        >
          <Icon size="20" name="event/link" className="mr-1" />
          <Tooltip
            delay={0}
            arrow
            animation="fade"
            hideOnClick={false}
            position="bottom center"
            title={isCopied ? 'URL Copied to clipboard' : 'Click to copy'}
          >
            {location}
          </Tooltip>
        </div>
      )}
      {!isAssist ? (
        <div
          className="ml-auto text-sm flex items-center color-gray-medium gap-2"
          style={{ width: 'max-content' }}
        >
          <div
            onClick={showReportModal}
            className="cursor-pointer rounded flex items-center p-2 gap-1 hover:bg-gray-light-shade"
          >
            <Icon name="file-pdf" size={16} />
            <span>Create Bug Report</span>
          </div>
          <ItemMenu
            items={[
              { key: 1, component: <NotePopup /> },
              {
                key: 2,
                component: props.jiraConfig && props.jiraConfig.token && (
                  <Issues sessionId={props.sessionId} />
                ),
              },
              {
                key: 3,
                component: (
                  <SharePopup
                    entity="sessions"
                    id={props.sessionId}
                    showCopyLink={true}
                    trigger={
                      <div className="flex items-center h-full w-full">
                        <Icon
                          className="mr-2"
                          disabled={props.disabled}
                          name="share-alt"
                          size="16"
                        />
                        <span>Share</span>
                      </div>
                    }
                  />
                ),
              },
              {
                key: 4,
                component: <Bookmark noMargin sessionId={props.sessionId} />,
              },
            ]}
          />

          <div>
            <Autoplay />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SubH = connectPlayer((state) => ({ width: state.width, height: state.height, currentLocation: state.location }))(SubHeader);

export default React.memo(SubH);

import React from 'react';
import { Icon, Tooltip, Button } from 'UI';
import QueueControls from './QueueControls';
import Bookmark from 'Shared/Bookmark';
import SharePopup from '../shared/SharePopup/SharePopup';
import copy from 'copy-to-clipboard';
import Issues from './Issues/Issues';
import NotePopup from './components/NotePopup';
import ItemMenu from './components/HeaderMenu';
import { useModal } from 'App/components/Modal';
import BugReportModal from './BugReport/BugReportModal';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import AutoplayToggle from 'Shared/AutoplayToggle';

function SubHeader(props) {
  const { player, store } = React.useContext(PlayerContext)
  const {
    width,
    height,
    location: currentLocation,
    fetchList,
    graphqlList,
    resourceList,
    exceptionsList,
    eventList: eventsList,
    endTime,
  } = store.get()

  const mappedResourceList = resourceList
    .filter((r) => r.isRed() || r.isYellow())
    .concat(fetchList.filter((i) => parseInt(i.status) >= 400))
    .concat(graphqlList.filter((i) => parseInt(i.status) >= 400))

  const [isCopied, setCopied] = React.useState(false);
  const { showModal, hideModal } = useModal();

  const location =
    currentLocation && currentLocation.length > 60
      ? `${currentLocation.slice(0, 60)}...`
      : currentLocation;

  const showReportModal = () => {
    player.pause();
    const xrayProps = {
      currentLocation: currentLocation,
      resourceList: mappedResourceList,
      exceptionsList: exceptionsList,
      eventsList: eventsList,
      endTime: endTime,
    }
    showModal(<BugReportModal width={width} height={height} xrayProps={xrayProps} hideModal={hideModal} />, { right: true });
  };

  return (
    <div className="w-full px-4 py-2 flex items-center border-b">

      {location && (
        <div
          className="flex items-center cursor-pointer color-gray-medium text-sm p-1 hover:bg-gray-light-shade rounded-md"
          onClick={() => {
            copy(currentLocation);
            setCopied(true);
            setTimeout(() => setCopied(false), 5000);
          }}
        >
          <Icon size="20" name="event/link" className="mr-1" />
          <Tooltip title={isCopied ? 'URL Copied to clipboard' : 'Click to copy'}>
            {location}
          </Tooltip>
        </div>
      )}
        <div
          className="ml-auto text-sm flex items-center color-gray-medium gap-2"
          style={{ width: 'max-content' }}
        >
          <Button icon="file-pdf" variant="text" onClick={showReportModal}>
            Create Bug Report
          </Button>
          <NotePopup />
          <Issues sessionId={props.sessionId} />
          <SharePopup
            entity="sessions"
            id={props.sessionId}
            showCopyLink={true}
            trigger={
              <div className="relative">
                <Button icon="share-alt" variant="text" className="relative">
                  Share
                </Button>
              </div>
            }
          />
          <ItemMenu
            items={[
              {
                key: 1,
                component: <AutoplayToggle />,
              },
              {
                key: 2,
                component: <Bookmark noMargin sessionId={props.sessionId} />,
              },
            ]}
          />

          <div>
            <QueueControls />
          </div>
        </div>
    </div>
  );
}

export default observer(SubHeader);

import React from 'react';
import { Icon } from 'UI';
import Autoplay from './Autoplay';
import Bookmark from 'Shared/Bookmark';
import SharePopup from '../shared/SharePopup/SharePopup';
import copy from 'copy-to-clipboard';
import { Tooltip } from 'react-tippy';
import Issues from './Issues/Issues';
import NotePopup from './components/NotePopup';
import { connectPlayer } from 'Player';

function SubHeader(props) {
  const [isCopied, setCopied] = React.useState(false);

  const isAssist = window.location.pathname.includes('/assist/');

  const location =
    props.currentLocation && props.currentLocation.length > 60
      ? `${props.currentLocation.slice(0, 60)}...`
      : props.currentLocation;

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
          className="ml-auto text-sm flex items-center color-gray-medium"
          style={{ width: 'max-content' }}
        >
          <NotePopup />
          <div className="cursor-pointer mr-4 hover:bg-gray-light-shade rounded-md p-1">
            {props.jiraConfig && props.jiraConfig.token && <Issues sessionId={props.sessionId} />}
          </div>
          <div className="cursor-pointer">
            <SharePopup
              entity="sessions"
              id={props.sessionId}
              showCopyLink={true}
              trigger={
                <div className="flex items-center hover:bg-gray-light-shade rounded-md p-1">
                  <Icon className="mr-2" disabled={props.disabled} name="share-alt" size="16" />
                  <span>Share</span>
                </div>
              }
            />
          </div>
          <div className="mx-4 hover:bg-gray-light-shade rounded-md p-1">
            <Bookmark noMargin sessionId={props.sessionId} />
          </div>
          <div>
            <Autoplay />
          </div>
          <div></div>
        </div>
      ) : null}
    </div>
  );
}

const SubH = connectPlayer(
  (state) => ({ currentLocation: state.location })
)(SubHeader);

export default React.memo(SubH);

import React from 'react';
import { Icon } from 'UI';
import Autoplay from './Autoplay';
import Bookmark from 'Shared/Bookmark'
import SharePopup from '../shared/SharePopup/SharePopup';
import { connectPlayer } from 'Player';
import copy from 'copy-to-clipboard';
import { Tooltip } from 'react-tippy';

function SubHeader(props) {
    const [isCopied, setCopied] = React.useState(false);

    const isAssist = window.location.pathname.includes('/assist/');
    if (isAssist) return null;

    const location = props.currentLocation && props.currentLocation.length > 60 ? `${props.currentLocation.slice(0, 60)}...` : props.currentLocation
    return (
        <div className="w-full px-4 py-2 flex items-center">
            {location && (
                <div
                    className="flex items-center cursor-pointer color-gray-medium text-lg"
                    onClick={() => {
                        copy(props.currentLocation);
                        setCopied(true)
                        setTimeout(() => setCopied(false), 5000)
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
            <div className="ml-auto flex items-center color-gray-medium" style={{ width: 'max-content' }}>
                <div className="cursor-pointer">
                    <SharePopup
                        entity="sessions"
                        id={ props.sessionId }
                        showCopyLink={true}
                        trigger={
                            <div className="flex items-center">
                                <Icon
                                    className="mr-2"
                                    disabled={ props.disabled }
                                    name="share-alt"
                                    size="16"
                                    plain
                                />
                                <span>Share</span>
                            </div>
                        }
                    />
                </div>
                <div className="mx-4">
                    <Bookmark />
                </div>
                <div>
                    <Autoplay />
                </div>
                <div>
                </div>
            </div>
        </div>
    )
}

const SubH = connectPlayer(state => ({ currentLocation: state.location }))(SubHeader)

export default React.memo(SubH)

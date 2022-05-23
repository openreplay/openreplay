import React from 'react';
import { Icon } from 'UI';
import Autoplay from './Autoplay';
import Bookmark from 'Shared/Bookmark'
import SharePopup from '../shared/SharePopup/SharePopup';

function SubHeader(props) {
    const isAssist = window.location.pathname.includes('/assist/');

    if (isAssist) return null;
    return (
        <div className="w-full p-4">
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

export default React.memo(SubHeader)

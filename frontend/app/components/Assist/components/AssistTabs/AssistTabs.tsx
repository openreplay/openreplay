import React, { useEffect, useState } from 'react';
import { SlideModal, Avatar, TextEllipsis, Icon } from 'UI';
import SessionList from '../SessionList';
import stl from './assistTabs.css'

interface Props {
  userId: any,
  userNumericHash: any,
}

const AssistTabs = (props: Props) => {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative mr-4">
      <div className="flex items-center">
        {props.userId && (
          <>
            <div className="flex items-center mr-3">
              {/* <Icon name="user-alt" color="gray-darkest" /> */}
              <Avatar iconSize="20" width="30px" height="30px" seed={ props.userNumericHash } />
              <div className="ml-2 font-medium">
                <TextEllipsis maxWidth={120} inverted popupProps={{ inverted: true, size: 'tiny' }}>
                  {props.userId}'s asdasd asdasdasdasd
                </TextEllipsis>
              </div>
            </div>
            <div
              className={stl.btnLink}
              onClick={() => setShowMenu(!showMenu)}
            >
              Active Sessions
            </div>
          </>
        )}
      </div>
      <SlideModal
        title={ <div>Live Sessions by {props.userId}</div> }
        isDisplayed={ showMenu }
        content={ showMenu && <SessionList /> }
        onClose={ () => setShowMenu(false) }
      />
    </div>
  );
};

export default AssistTabs;
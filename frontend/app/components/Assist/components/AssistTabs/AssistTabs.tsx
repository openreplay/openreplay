import React, { useEffect, useState } from 'react';
import { SlideModal, Icon } from 'UI';
import SessionList from '../SessionList';
import stl from './assistTabs.css'

interface Props {
  userId: any,
}

const AssistTabs = (props: Props) => {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative mr-4">
      <div className="flex items-center">
        {props.userId && (
          <>
            <div className="flex items-center mr-3">
              <Icon name="user-alt" color="gray-darkest" />
              <div className="ml-2">{props.userId}</div>
            </div>
            <div
              className={stl.btnLink}
              onClick={() => setShowMenu(!showMenu)}
            >
              All Active Sessions
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
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
        <div
          className={stl.btnLink}
          onClick={() => setShowMenu(!showMenu)}
        >
          More Live Sessions
        </div>
        <span className="mx-3 color-gray-medium">by</span>
        <div className="flex items-center">
          <Icon name="user-alt" color="gray-darkest" />
          <div className="ml-2">{props.userId}</div>
        </div>
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
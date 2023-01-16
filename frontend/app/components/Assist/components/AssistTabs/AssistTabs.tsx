import { useModal } from 'App/components/Modal';
import React, { useState } from 'react';
import SessionList from '../SessionList';
import stl from './assistTabs.module.css'

interface Props {
  userId: any,
  userNumericHash: any,
}

const AssistTabs = (props: Props) => {
  const [showMenu, setShowMenu] = useState(false)
  const { showModal } = useModal();

  return (
    <div className="relative mr-4">
      <div className="flex items-center">
        {props.userId && (
          <>
            <div
              className={stl.btnLink}
              onClick={() => showModal(<SessionList userId={props.userId} />, { right: true, width: 700 })}
            >
              Active Sessions
            </div>
          </>
        )}
      </div>
      {/* <SlideModal
        title={ <div>{props.userId}'s <span className="color-gray-medium">Live Sessions</span> </div> }
        isDisplayed={ showMenu }
        content={ showMenu && <SessionList /> }
        onClose={ () => setShowMenu(false) }
      /> */}
    </div>
  );
};

export default AssistTabs;

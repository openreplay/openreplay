import React, { useEffect, useState } from 'react';
import { SlideModal } from 'UI';
import SessionList from '../SessionList';

interface Props {
  userId: any,
}

const AssistTabs = React.memo((props: Props) => {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative mr-4">
      <div className="p-2 cursor-pointer" onClick={() => setShowMenu(!showMenu)}>
        Live Sessions
      </div>
      <SlideModal
        title={ <div>Live Sessions by {props.userId}</div> }
        isDisplayed={ showMenu }
        content={ showMenu && <SessionList /> }
        onClose={ () => setShowMenu(false) }
      />
    </div>
  );
});

export default AssistTabs;
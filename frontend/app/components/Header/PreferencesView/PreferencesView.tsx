import React from 'react';
import { Icon } from 'UI';
import { withRouter } from 'react-router-dom';

interface Props {
  history: any;
}
function PreferencesView(props: Props) {
  const onExit = () => {
    props.history.push('/');
  };
  return (
    <>
      <div className="flex items-center p-3 cursor-pointer text-lg ml-1" onClick={onExit}>
        <Icon name="arrow-bar-left" color="teal" size="18" />
        <span className="color-teal ml-2">Exit Preferences</span>
      </div>

      <div className="flex items-center p-3 text-lg">
        <Icon name="info-circle" size="16" color="gray-dark" />
        <span className="ml-2">Any changes will be put into effect across your organization.</span>
      </div>
    </>
  );
}

export default withRouter(PreferencesView);

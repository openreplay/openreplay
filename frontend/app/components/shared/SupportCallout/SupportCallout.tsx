import React from 'react';
import SlackIcon from '../../../svg/slack-help.svg';
import { Popup } from 'UI';

function SupportCallout() {
  return (
    <a href="https://slack.openreplay.com" target="_blank">
      <div className="w-12 h-12 absolute z-50 cursor-pointer right-0 bottom-0 m-4">
        <Popup content="OpenReplay community" delay={0}>
          <img src={SlackIcon} />
        </Popup>
      </div>
    </a>
  );
}

export default SupportCallout;

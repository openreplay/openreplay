import React from 'react';
import SlackIcon from '../../../svg/slack-help.svg';
import { Popup } from 'UI';

function SupportCallout() {
  return (
    <a href="https://slack.openreplay.com" target="_blank" className="fixed z-50 left-0 bottom-0">
      <div className="w-12 h-12 cursor-pointer m-4">
        <Popup content="OpenReplay community" delay={0}>
          <img src={SlackIcon} />
        </Popup>
      </div>
    </a>
  );
}

export default SupportCallout;

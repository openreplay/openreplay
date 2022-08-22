import React from 'react';
import SlackIcon from '../../../svg/integrations/slack.svg';
import { Popup } from 'UI';

function SupportCallout() {
  return (
    <Popup content="" delay={0}>
      <a href="https://slack.openreplay.com" target="_blank">
        <div className="w-12 h-12 rounded-full bg-white border absolute z-50 cursor-pointer p-2 shadow right-0 bottom-0 m-4 hover:shadow-lg">
          <img src={SlackIcon} />
        </div>
      </a>
    </Popup>
  );
}

export default SupportCallout;

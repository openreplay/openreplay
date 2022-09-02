import React from 'react';
import { Tooltip } from 'react-tippy';

export const FEATURE_KEYS = {
  XRAY: 'featureViewed'
}

interface IProps {
  children: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  key?: keyof typeof FEATURE_KEYS
}

export default function GuidePopup({ children, title, description }: IProps) {
  return (
    // @ts-ignore
    <Tooltip
      html={
        <div>
          <div className="font-bold">
            {title}
          </div>
          <div className="color-gray-medium">
            {description}
          </div>
        </div>
      }
      distance={30}
      theme={'light'}
      open={true}
      arrow={true}
    >
      {children}
    </Tooltip>
  );
}

import { Icon } from 'UI';
import {
  Code,
  MousePointerClick,
  SquareActivity,
  Navigation,
  TextCursorInput,
  ArrowUpDown,
} from 'lucide-react';
import React from 'react';

export const getEventIcon = (isAutocapture: boolean, eventName: string) => {
  if (!isAutocapture) {
    return <Code size={16} />;
  }
  if (eventName === 'LOCATION') {
    return <Navigation size={16} />;
  }
  if (eventName === 'CLICK') {
    return <MousePointerClick size={16} />;
  }
  if (eventName === 'PERFORMANCE') {
    return <SquareActivity size={16} />;
  }
  if (eventName === 'INPUT') {
    return <TextCursorInput size={16} />;
  }
  if (eventName === 'REQUEST') {
    return <ArrowUpDown size={16} />;
  }
  return <Icon name={'logo-small-white'} size={16} />;
};
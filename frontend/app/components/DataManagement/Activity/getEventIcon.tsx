import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import {
  ArrowUpDown,
  Code2,
  MousePointerClick,
  Navigation,
  SquareActivity,
  TextCursorInput,
} from 'lucide-react';
import React from 'react';

const AUTO: Record<string, typeof Code2> = {
  LOCATION: Navigation,
  CLICK: MousePointerClick,
  PERFORMANCE: SquareActivity,
  INPUT: TextCursorInput,
  REQUEST: ArrowUpDown,
};

export const getEventIcon = (
  isAutocapture: boolean,
  eventName: string,
  size = 13,
) => {
  if (!isAutocapture) return <Code2 size={size} aria-hidden="true" />;
  const Glyph = AUTO[eventName];
  return Glyph ? (
    <Glyph size={size} aria-hidden="true" />
  ) : (
    <OpenReplayMark variant="plain" size={size - 1} />
  );
};

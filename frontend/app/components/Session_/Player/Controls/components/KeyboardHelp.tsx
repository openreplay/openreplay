import React from 'react';
import { Keyboard } from 'lucide-react';
import { Button, Tooltip } from 'antd';
import { useModal } from 'Components/Modal';

function Key({ label }: { label: string }) {
  return (
    <div
      style={{ minWidth: 52 }}
      className="whitespace-nowrap font-normal bg-indigo-50 rounded-lg px-2 py-1 text-figmaColors-text-primary text-center font-mono"
    >
      {label}
    </div>
  );
}

function Cell({ shortcut, text }: any) {
  return (
    <div className="flex items-center gap-2 justify-start rounded">
      <Key label={shortcut} />
      <span>{text}</span>
    </div>
  );
}

export function LaunchConsoleShortcut() {
  return <Key label="⇧ + C" />;
}
export function LaunchNetworkShortcut() {
  return <Key label="⇧ + N" />;
}
export function LaunchPerformanceShortcut() {
  return <Key label="⇧ + P" />;
}
export function LaunchStateShortcut() {
  return <Key label="⇧ + R" />;
}
export function LaunchEventsShortcut() {
  return <Key label="⇧ + E" />;
}
export function PlaySessionInFullscreenShortcut() {
  return <Key label="⇧ + F" />;
}
export function PlayPauseSessionShortcut() {
  return <Key label="Space" />;
}
export function LaunchXRaShortcut() {
  return <Key label="⇧ + X" />;
}
export function LaunchUserActionsShortcut() {
  return <Key label="⇧ + A" />;
}
export function LaunchMoreUserInfoShortcut() {
  return <Key label="⇧ + I" />;
}
export function LaunchOptionsMenuShortcut() {
  return <Key label="⇧ + M" />;
}
export function PlayNextSessionShortcut() {
  return <Key label="⇧ + >" />;
}
export function PlayPreviousSessionShortcut() {
  return <Key label="⇧ + <" />;
}
export function SkipForwardShortcut() {
  return <Key label="→" />;
}
export function SkipBackwardShortcut() {
  return <Key label="←" />;
}
export function PlaybackSpeedShortcut() {
  return <Key label="↑ / ↓" />;
}

export function ShortcutGrid() {
  return (
    <div className=" grid grid-cols-1 grid-flow-row-dense auto-cols-max gap-4 justify-items-start">
      <Cell shortcut="⇧ + U" text="Copy Session URL with time" />
      <Cell shortcut="⇧ + C" text="Launch Console" />
      <Cell shortcut="⇧ + N" text="Launch Network" />
      <Cell shortcut="⇧ + P" text="Launch Performance" />
      <Cell shortcut="⇧ + R" text="Launch State" />
      <Cell shortcut="⇧ + E" text="Launch Events" />
      <Cell shortcut="⇧ + F" text="Play Session in Fullscreen" />
      <Cell shortcut="Space" text="Play/Pause Session" />
      <Cell shortcut="⇧ + X" text="Launch X-Ray" />
      <Cell shortcut="⇧ + A" text="Launch User Actions" />
      <Cell shortcut="⇧ + I" text="Launch More User Info" />
      <Cell shortcut="⇧ + M" text="Launch Options Menu" />
      <Cell shortcut="⇧ + >" text="Play Next Session" />
      <Cell shortcut="⇧ + <" text="Play Previous Session" />
      <Cell shortcut="→" text="Skip Forward" />
      <Cell shortcut="←" text="Skip Backward" />
      <Cell shortcut="↑" text="Playback Speed Up" />
      <Cell shortcut="↓" text="Playback Speed Down" />
    </div>
  );
}

function KeyboardHelp() {
  const { showModal } = useModal();
  return (
    <Tooltip placement="bottom" title="Keyboard Shortcuts">
      <Button
        size="small"
        className="flex items-center justify-center"
        onClick={() => {
          showModal(<ShortcutGrid />, { right: true, width: 320 });
        }}
      >
        <Keyboard size={18} />
      </Button>
    </Tooltip>
  );
}

export default KeyboardHelp;

import React from 'react';
import { Keyboard } from 'lucide-react';
import { Button, Tooltip } from 'antd';
import { useModal } from 'Components/Modal';

const Key = ({ label }: { label: string }) => (
  <div
    style={{ minWidth: 52 }}
    className="whitespace-nowrap font-normal bg-indigo-50 rounded-lg px-2 py-1 text-figmaColors-text-primary text-center font-mono"
  >
    {label}
  </div>
);

function Cell({ shortcut, text }: any) {
  return (
    <div className="flex items-center gap-2 justify-start rounded">
      <Key label={shortcut} />
      <span>{text}</span>
    </div>
  );
}

export const LaunchConsoleShortcut = () => <Key label={'⇧ + C'} />;
export const LaunchNetworkShortcut = () => <Key label={'⇧ + N'} />;
export const LaunchPerformanceShortcut = () => <Key label={'⇧ + P'} />;
export const LaunchStateShortcut = () => <Key label={'⇧ + R'} />;
export const LaunchEventsShortcut = () => <Key label={'⇧ + E'} />;
export const PlaySessionInFullscreenShortcut = () => <Key label={'⇧ + F'} />;
export const PlayPauseSessionShortcut = () => <Key label={'Space'} />;
export const LaunchXRaShortcut = () => <Key label={'⇧ + X'} />;
export const LaunchUserActionsShortcut = () => <Key label={'⇧ + A'} />;
export const LaunchMoreUserInfoShortcut = () => <Key label={'⇧ + I'} />;
export const LaunchOptionsMenuShortcut = () => <Key label={'⇧ + M'} />;
export const PlayNextSessionShortcut = () => <Key label={'⇧ + >'} />;
export const PlayPreviousSessionShortcut = () => <Key label={'⇧ + <'} />;
export const SkipForwardShortcut = () => <Key label={'→'} />;
export const SkipBackwardShortcut = () => <Key label={'←'} />;
export const PlaybackSpeedShortcut = () => <Key label={'↑ / ↓'} />;

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
        size={'small'}
        className={'flex items-center justify-center'}
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

import React from 'react';

function Key({ label }: { label: string }) {
  return (
    <div
      style={{ minWidth: 52 }}
      className="whitespace-nowrap font-normal bg-active-blue rounded-lg px-2 py-1 text-black text-center font-mono"
    >
      {label}
    </div>
  );
}

function Cell({ shortcut, text }: any) {
  return (
    <div className="flex items-center gap-2 justify-start rounded-sm">
      <Key label={shortcut} />
      <span>{text}</span>
    </div>
  );
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
      <Cell shortcut="Esc" text="Leave Fullscreen" />
      <Cell shortcut="Space" text="Play/Pause Session" />
      <Cell shortcut="⇧ + X" text="Launch X-Ray" />
      <Cell shortcut="⇧ + A" text="Launch User Actions" />
      <Cell shortcut="⇧ + I" text="Launch More User Info" />
      <Cell shortcut="⇧ + >" text="Play Next Session" />
      <Cell shortcut="⇧ + <" text="Play Previous Session" />
      <Cell shortcut="→" text="Skip Forward" />
      <Cell shortcut="←" text="Skip Backward" />
      <Cell shortcut="↑" text="Playback Speed Up" />
      <Cell shortcut="↓" text="Playback Speed Down" />
    </div>
  );
}

import type { CSSProperties } from 'react';

import { AVATAR_GLYPHS } from './glyphs';
import './session-avatar.css';

export const AVATAR_HUES = 12;

export const hueIndexFor = (seed: number) =>
  Math.abs(Math.trunc(seed)) % AVATAR_HUES;

export interface SessionAvatarProps {
  /** `userNumericHash`: picks the glyph and the row's hue. */
  seed: number;
  size?: number;
  className?: string;
}

export function SessionAvatar({
  seed,
  size = 20,
  className,
}: SessionAvatarProps) {
  // same pick as avatarIconName (App/iconNames), which the old <Icon> path used
  const Glyph =
    AVATAR_GLYPHS[Math.abs(Math.trunc(seed)) % AVATAR_GLYPHS.length];
  return (
    <span
      className={`m-savatar${className ? ` ${className}` : ''}`}
      style={
        {
          '--m-avatar-i': hueIndexFor(seed),
          width: size,
          height: size,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="m-savatar__glyph">
        <Glyph size={Math.round(size * 0.7)} />
      </span>
    </span>
  );
}

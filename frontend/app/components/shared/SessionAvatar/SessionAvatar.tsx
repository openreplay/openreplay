import { type CSSProperties, useId } from 'react';

import {
  Boil,
  type P,
  RoughDefs,
  inked,
  poly,
  ring,
  rng,
  roughOf,
} from 'Shared/Celebration/hand';

import { AVATAR_GLYPHS } from './glyphs';
import './session-avatar.css';

export const AVATAR_HUES = 12;

export const hueIndexFor = (seed: number) =>
  Math.abs(Math.trunc(seed)) % AVATAR_HUES;

// same pick as avatarIconName (App/iconNames), which the old <Icon> path used
const glyphFor = (seed: number) =>
  AVATAR_GLYPHS[Math.abs(Math.trunc(seed)) % AVATAR_GLYPHS.length];

export interface SessionAvatarProps {
  /** `userNumericHash`: picks the face and the hue. */
  seed: number;
  /** The face's edge in px; the cube's top and side reach past it. */
  size?: number;
  /** Hop on hover, where there is room for it (a card, a replay header).
      Such a robot is laid out whole, head included. */
  cheer?: boolean;
  className?: string;
}

/** A face alone, on its tint: what the cube robots wear. */
export function AvatarFace({
  seed,
  size = 20,
  className,
}: Omit<SessionAvatarProps, 'cheer'>) {
  const Glyph = glyphFor(seed);
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

/* The cube in face units: a 24 square front, 6 x 5 of depth up and to the
   right, an antenna on the top face. In a row the layout box is the front
   alone, so the robot takes the old avatar's place and its top reaches into
   the row's air. */
const F = 24;
const DX = 6;
const DY = 5;
const T = 11;
const VW = F + DX;
const VH = T + F;
/** From this face edge up the robot is drawn by hand. */
const INK_FROM = 40;

const FRONT: P[] = [
  [0, T],
  [F, T],
  [F, T + F],
  [0, T + F],
];
const TOP: P[] = [
  [0, T],
  [DX, T - DY],
  [F + DX, T - DY],
  [F, T],
];
const SIDE: P[] = [
  [F, T],
  [F + DX, T - DY],
  [F + DX, T + F - DY],
  [F, T + F],
];
const SILHOUETTE: P[] = [
  [0, T],
  [DX, T - DY],
  [F + DX, T - DY],
  [F + DX, T + F - DY],
  [F, T + F],
  [0, T + F],
];
const ANTENNA: P[] = [
  [(F + DX) / 2, T - DY / 2],
  [(F + DX) / 2 + 1.4, T - DY / 2 - 2.6],
  [(F + DX) / 2 + 2.6, T - DY / 2 - 5],
];
const BOBBLE: P = [(F + DX) / 2 + 3.4, T - DY / 2 - 6.4];
const line = (pts: P[]) =>
  `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}`;

/** Who a user is: the cube robot wearing their face. Flat at row size; from
    INK_FROM up, in the hand-inked line the celebrations use. */
export function SessionAvatar({
  seed,
  size = 20,
  cheer = false,
  className,
}: SessionAvatarProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ink = size >= INK_FROM;
  const unit = size / F;
  const Glyph = glyphFor(seed);
  const rough = roughOf(uid);
  return (
    <span
      className={`m-sbot${ink ? ' is-inked' : ''}${cheer ? ' can-cheer' : ''}${className ? ` ${className}` : ''}`}
      style={
        {
          '--m-avatar-i': hueIndexFor(seed),
          width: VW * unit,
          height: cheer ? VH * unit : size,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span
        className="m-sbot__body"
        style={{
          top: cheer ? 0 : -T * unit,
          width: VW * unit,
          height: VH * unit,
        }}
      >
        <svg viewBox={`0 0 ${VW} ${VH}`} className="m-sbot__svg" fill="none">
          {ink && <RoughDefs uid={uid} scale={0.9} />}
          <path d={poly(TOP)} className="m-sbot__top" />
          <path d={poly(FRONT)} className="m-sbot__front" />
          <path d={poly(SIDE)} className="m-sbot__side" />
          {!ink && (
            <>
              <path d={line(ANTENNA)} className="m-sbot__antenna" />
              <circle
                cx={BOBBLE[0]}
                cy={BOBBLE[1]}
                r={1.7}
                className="m-sbot__bobble"
              />
            </>
          )}
          {ink && (
            <Boil>
              {(k) => {
                const r = rng(seed * 7 + k * 13 + 1);
                return (
                  <g filter={rough(k)} className="m-sbot__line">
                    <path d={inked(SILHOUETTE, true, r, 0.35)} />
                    <path
                      d={inked(
                        [
                          [0, T],
                          [F, T],
                          [F + DX, T - DY],
                        ],
                        false,
                        r,
                        0.3,
                      )}
                    />
                    <path
                      d={inked(
                        [
                          [F, T],
                          [F, T + F],
                        ],
                        false,
                        r,
                        0.3,
                      )}
                    />
                    <path d={inked(ANTENNA, false, r, 0.25)} />
                    <path
                      d={ring(BOBBLE[0], BOBBLE[1], 1.7, r, 0.2)}
                      className="m-sbot__bobble"
                    />
                  </g>
                );
              }}
            </Boil>
          )}
        </svg>
        <span
          className="m-sbot__face"
          style={{ top: T * unit, width: size, height: size }}
        >
          <Glyph size={Math.round(size * 0.66)} />
        </span>
      </span>
    </span>
  );
}

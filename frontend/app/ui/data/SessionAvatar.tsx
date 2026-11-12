import type { CSSProperties, ReactNode } from 'react';

import { type AvatarFace, hueIndexFor } from './avatar';
import { robotArt } from './robot';
import './session-avatar.css';

export interface SessionAvatarProps {
  seed: string;
  size?: number;
  face?: AvatarFace;
  /** eyes and mouth only, for a robot that draws its own head */
  faceOnly?: boolean;
  presence?: 'active' | 'inactive';
  animated?: boolean;
  className?: string;
}

const LIVE_FACES: { kind: string; part: AvatarFace }[] = [
  { kind: 'drift', part: { mouth: 'smile' } },
  { kind: 'blink', part: { eyes: 'soft' } },
];

export function SessionAvatar({
  seed,
  size = 20,
  face,
  faceOnly = false,
  presence,
  animated,
  className,
}: SessionAvatarProps) {
  const { dark, light } = robotArt(seed, face, faceOnly);

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
      <img
        className="m-savatar__img is-light"
        src={light}
        alt=""
        width={size}
        height={size}
        decoding="async"
      />
      <img
        className="m-savatar__img is-dark"
        src={dark}
        alt=""
        width={size}
        height={size}
        decoding="async"
      />
      {animated &&
        !face &&
        LIVE_FACES.map(({ kind, part }) => {
          const art = robotArt(seed, part);
          return (
            <span
              key={kind}
              className={`m-savatar__live m-savatar__live--${kind}`}
            >
              <img
                className="m-savatar__img is-light"
                src={art.light}
                alt=""
                width={size}
                height={size}
                decoding="async"
              />
              <img
                className="m-savatar__img is-dark"
                src={art.dark}
                alt=""
                width={size}
                height={size}
                decoding="async"
              />
            </span>
          );
        })}
      {presence && <span className={`m-savatar__presence is-${presence}`} />}
    </span>
  );
}

/**
 * The robot inside an SVG drawing: SVG <image>s in the drawing's own
 * coordinates, never HTML in a <foreignObject> (Safari lays that out without
 * the drawing's scale, so the faces slid off their bodies on every iPhone).
 */
export function SvgAvatar({
  seed,
  face,
  faceOnly = false,
  x,
  y,
  size,
  ground,
  className,
  style,
  clipPath,
}: {
  seed: string;
  face?: AvatarFace;
  faceOnly?: boolean;
  x: number;
  y: number;
  size: number;
  ground?: ReactNode;
  className?: string;
  style?: CSSProperties;
  clipPath?: string;
}) {
  const { dark, light } = robotArt(seed, face, faceOnly);
  return (
    <g
      className={`m-savatar m-savatar--svg${className ? ` ${className}` : ''}`}
      style={{ '--m-avatar-i': hueIndexFor(seed), ...style } as CSSProperties}
      clipPath={clipPath}
      aria-hidden="true"
    >
      {ground}
      <image
        className="m-savatar__img is-light"
        href={light}
        x={x}
        y={y}
        width={size}
        height={size}
      />
      <image
        className="m-savatar__img is-dark"
        href={dark}
        x={x}
        y={y}
        width={size}
        height={size}
      />
    </g>
  );
}

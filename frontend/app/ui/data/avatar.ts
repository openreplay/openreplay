/** The avatar's seed: the user id, else the anonymous id (a visit with
 *  neither is its own). Never a hash: two identities could share a robot. */
export const seedFor = (identity: {
  userId?: string | null;
  userAnonymousId?: string | null;
  sessionId?: string;
}): string =>
  identity.userId || identity.userAnonymousId || identity.sessionId || '';

export interface AvatarFace {
  eyes?:
    | 'blocks'
    | 'happy'
    | 'round'
    | 'slim'
    | 'soft'
    | 'tall'
    | 'wide'
    | 'dots'
    | 'goggles'
    | 'heart'
    | 'visor'
    | 'cyclops'
    | 'content';
  mouth?:
    | 'bigSmile'
    | 'flat'
    | 'open'
    | 'smile'
    | 'tiny'
    | 'oh'
    | 'cat'
    | 'dot';
}

export const AVATAR_HUES = 12;

export function hueIndexFor(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) % AVATAR_HUES;
}

const channel = (hex: string, i: number) =>
  parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

export function hueOf(hex: string): number {
  const [r, g, b] = [0, 1, 2].map((i) => toLinear(channel(hex, i))) as [
    number,
    number,
    number,
  ];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return (Math.atan2(bb, a) * 180) / Math.PI;
}

const LIGHT_BODY_OPACITY = 0.14;
const LIGHT_FACE = { l: 0.46, c: 0.17 };

export function oklchToHex(l: number, c: number, hueDeg: number): string {
  const h = (hueDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const gamma = (v: number) => {
    const x = Math.min(1, Math.max(0, v));
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(g * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${gamma(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3)}${gamma(
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
  )}${gamma(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3)}`;
}

const LIGHT_NEUTRAL = { l: 0.4, c: 0.02, h: 255 };

export function lightVariant(
  svg: string,
  face: string,
  neutral = false,
): string {
  const deep = neutral
    ? oklchToHex(LIGHT_NEUTRAL.l, LIGHT_NEUTRAL.c, LIGHT_NEUTRAL.h)
    : oklchToHex(LIGHT_FACE.l, LIGHT_FACE.c, hueOf(face));
  const out = svg
    /* The body. DiceBear writes it as `fill-opacity=".4"`; matched loosely so a
       formatting change upstream does not silently stop this working. The
       half-strength details are `.55` and keep theirs. */
    .replace(/fill-opacity="0?\.4"/g, `fill-opacity="${LIGHT_BODY_OPACITY}"`)
    /* The face, everywhere it appears. Matched as a whole attribute value, so
       the zero-alpha background (`#ffffff00`) of a white robot is left alone. */
    .replaceAll(`"${face}"`, `"${deep}"`);
  return `data:image/svg+xml;utf8,${encodeURIComponent(out)}`;
}

import type { PropSlot } from './Bot';
import type { Drawing, Move } from './Inked';
import { ACCENT, type P, PAPER, disc, inked, poly, ring, rrect } from './ink';
import { MORE_PROPS } from './props-more';

export interface PropDef {
  label: string;
  use: string;
  slot: PropSlot;
  move?: Move;
  draw: () => Drawing;
}

export const shadow = (cx: number, w: number) => (
  <ellipse cx={cx} cy={71} rx={w} ry={2.6} className="m-ill__ground" />
);

const BASE_PROPS = {
  magnifier: {
    label: 'Magnifier',
    use: 'Searching; nothing matches',
    slot: 'side',
    move: 'scan',
    draw: () => [
      {
        fill: <path d={poly(disc(-3, -3, 7))} className={PAPER} />,
        line: (r) => (
          <>
            <path d={ring(-3, -3, 7, r, 0.35)} />
            <path
              d={inked(
                [
                  [2.3, 2.3],
                  [10, 10],
                ],
                false,
                r,
                0.4,
              )}
              className="m-ill__thick"
            />
            <path
              d={inked(
                [
                  [-6.5, -5],
                  [-4.5, -7],
                ],
                false,
                r,
                0.25,
              )}
              className="m-ill__hair"
            />
          </>
        ),
      },
    ],
  },
  flag: {
    label: 'Flag',
    use: 'Done, arrived, the first of something',
    slot: 'head',
    draw: () => {
      const cloth: P[] = [
        [-7, -11],
        [10, -8.5],
        [6, -4],
        [10, 0.5],
        [-7, -2],
      ];
      return [
        {
          line: (r) => (
            <path
              d={inked(
                [
                  [-7, 12],
                  [-7, -12],
                ],
                false,
                r,
                0.35,
              )}
            />
          ),
        },
        {
          fill: <path d={poly(cloth)} className={ACCENT} />,
          line: (r) => <path d={inked(cloth, true, r, 0.4)} />,
          move: 'wave',
          origin: [-7, -6],
        },
      ];
    },
  },
  bookmark: {
    label: 'Bookmark',
    use: 'Saved for later',
    slot: 'head',
    move: 'bob',
    draw: () => {
      const rib: P[] = [
        [-6, -11],
        [6, -11],
        [6, 11],
        [0, 6],
        [-6, 11],
      ];
      return [
        {
          fill: <path d={poly(rib)} className={ACCENT} />,
          line: (r) => <path d={inked(rib, true, r, 0.4)} />,
        },
      ];
    },
  },
  play: {
    label: 'Play sign',
    use: 'A session, a recording',
    slot: 'antenna',
    draw: () => {
      const card = rrect(-11, -8.5, 22, 17, 2.5);
      const tri: P[] = [
        [-3, -4.5],
        [-3, 4.5],
        [5, 0],
      ];
      return [
        {
          fill: <path d={poly(card)} className={PAPER} />,
          line: (r) => <path d={inked(card, true, r, 0.45)} />,
        },
        {
          fill: <path d={poly(tri)} className={ACCENT} />,
          line: (r) => <path d={inked(tri, true, r, 0.3)} />,
          move: 'pulse',
          origin: [1, 0],
        },
      ];
    },
  },
  bell: {
    label: 'Bell',
    use: 'An alert, a notice',
    slot: 'antenna',
    move: 'ring',
    draw: () => {
      const body: P[] = [
        [-8.5, 5],
        [-6.5, -3.5],
        [-3.5, -8],
        [3.5, -8],
        [6.5, -3.5],
        [8.5, 5],
      ];
      return [
        {
          fill: <path d={poly(body)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(body, true, r, 0.4)} />
              <path d={ring(0, -10, 1.6, r, 0.2)} />
              <path
                d={ring(0, 8, 2.2, r, 0.2)}
                className="m-ill__accent-fill"
              />
            </>
          ),
        },
      ];
    },
  },
} satisfies Record<string, PropDef>;

export const PROPS = { ...BASE_PROPS, ...MORE_PROPS };

export type PropKind = keyof typeof PROPS;

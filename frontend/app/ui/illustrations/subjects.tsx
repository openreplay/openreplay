import type { Drawing } from './Inked';
import { type P, inked, poly, ring, rrect } from './ink';
import { ACCENT, PAPER, type PropKind, disc } from './props';
import { SUBJECTS_A } from './subjects-a';
import { SUBJECTS_B } from './subjects-b';

export interface SubjectDef {
  label: string;
  prop: PropKind;
  draw: () => Drawing;
  withRobot?: () => Drawing;
}

export const shadow = (cx: number, w: number) => (
  <ellipse cx={cx} cy={71} rx={w} ry={2.6} className="m-ill__ground" />
);

function noMatchLayers(): Drawing {
  const list = rrect(8, 14, 62, 50, 4);
  return [
    {
      fill: (
        <>
          {shadow(46, 38)}
          <path d={poly(list)} className={PAPER} />
        </>
      ),
      line: (r) => (
        <>
          <path d={inked(list, true, r, 0.55)} />
          {[26, 38, 50].map((y) => (
            <path
              key={y}
              d={inked(
                [
                  [16, y],
                  [60, y],
                ],
                false,
                r,
                0.4,
              )}
              className="m-ill__soft m-ill__dash"
            />
          ))}
        </>
      ),
    },
    {
      fill: <path d={poly(disc(68, 34, 12))} className={PAPER} />,
      line: (r) => (
        <>
          <path d={ring(68, 34, 12, r, 0.45)} />
          <path
            d={inked(
              [
                [76.5, 42.5],
                [88, 54],
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
                [61, 30],
                [64.5, 26],
              ],
              false,
              r,
              0.3,
            )}
            className="m-ill__hair"
          />
        </>
      ),
      move: 'scan',
      origin: [68, 34],
    },
  ];
}

const BASE_SUBJECTS = {
  sessions: {
    label: 'Sessions',
    prop: 'play',
    draw: () => {
      const card = rrect(10, 8, 76, 56, 4);
      const back = rrect(14, 4, 76, 56, 4);
      const tri: P[] = [
        [42, 24],
        [42, 40],
        [56, 32],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 40)}
              <path d={poly(back)} className="m-ill__fill-side" />
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(back, true, r, 0.5)} className="m-ill__soft" />
              <path d={inked(card, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [18, 54],
                    [78, 54],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(tri)} className={ACCENT} />,
          line: (r) => <path d={inked(tri, true, r, 0.35)} />,
          move: 'pulse',
          origin: [48, 32],
        },
        {
          fill: <path d={poly(disc(34, 54, 2.6))} className={ACCENT} />,
          line: (r) => <path d={ring(34, 54, 2.6, r, 0.2)} />,
          move: 'scrub',
          origin: [34, 54],
        },
      ];
    },
  },
  sessionsInstall: {
    label: 'Sessions, nothing installed',
    prop: 'wrench',
    draw: () => {
      const card = rrect(16, 8, 72, 52, 4);
      const plug: P[] = [
        [54, 62],
        [62, 62],
        [62, 69],
        [54, 69],
      ];
      return [
        {
          fill: (
            <>
              {shadow(50, 40)}
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} className="m-ill__dash" />
              {[22, 32, 42].map((y, i) => (
                <path
                  key={y}
                  d={inked(
                    [
                      [26, y],
                      [i === 2 ? 58 : 76, y],
                    ],
                    false,
                    r,
                    0.4,
                  )}
                  className="m-ill__soft m-ill__dash"
                />
              ))}
              <path
                d={inked(
                  [
                    [44, 60],
                    [46, 64],
                    [52, 65],
                    [54, 65.5],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
            </>
          ),
        },
        {
          fill: <path d={poly(plug)} className={ACCENT} />,
          line: (r) => (
            <>
              <path d={inked(plug, true, r, 0.3)} />
              <path
                d={inked(
                  [
                    [62, 64],
                    [65, 64],
                  ],
                  false,
                  r,
                  0.15,
                )}
                className="m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [62, 67],
                    [65, 67],
                  ],
                  false,
                  r,
                  0.15,
                )}
                className="m-ill__hair"
              />
            </>
          ),
          move: 'bob',
          origin: [58, 66],
        },
      ];
    },
  },
  sessionsArriving: {
    label: 'Sessions, the first one arriving',
    prop: 'play',
    draw: () => {
      const card = rrect(10, 8, 76, 56, 4);
      const bar = rrect(18, 50, 36, 6, 3);
      const tri: P[] = [
        [43, 22],
        [43, 38],
        [56, 30],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 40)}
              <path d={poly(card)} className={PAPER} />
              <path d={poly(tri)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path d={inked(tri, true, r, 0.35)} className="m-ill__soft" />
              <path
                d={inked(rrect(18, 50, 60, 6, 3), true, r, 0.3)}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(bar)} className={ACCENT} />,
          line: (r) => (
            <path d={inked(bar, true, r, 0.3)} className="m-ill__hair" />
          ),
          move: 'pulse',
          origin: [18, 53],
        },
      ];
    },
  },
  sessionsQuiet: {
    label: 'Sessions, the tracker gone quiet',
    prop: 'stopwatch',
    draw: () => {
      const card = rrect(10, 8, 76, 56, 4);
      const line: P[] = [
        [18, 40],
        [36, 40],
        [41, 30],
        [46, 48],
        [51, 40],
        [78, 40],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 40)}
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path d={inked(line, false, r, 0.3)} className="m-ill__soft" />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(78, 40, 2.8))} className={ACCENT} />,
          line: (r) => (
            <path d={ring(78, 40, 2.8, r, 0.2)} className="m-ill__hair" />
          ),
          move: 'blink',
          origin: [78, 40],
        },
      ];
    },
  },
  sessionsPaused: {
    label: 'Sessions, recording paused',
    prop: 'flag',
    draw: () => {
      const card = rrect(10, 8, 76, 56, 4);
      const a = rrect(37, 22, 8, 22, 2);
      const b = rrect(51, 22, 8, 22, 2);
      return [
        {
          fill: (
            <>
              {shadow(48, 40)}
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [18, 54],
                    [78, 54],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: (
            <>
              <path d={poly(a)} className={ACCENT} />
              <path d={poly(b)} className={ACCENT} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(a, true, r, 0.3)} />
              <path d={inked(b, true, r, 0.3)} />
            </>
          ),
          move: 'pulse',
          origin: [48, 33],
        },
      ];
    },
  },
  sessionsMobile: {
    label: 'Sessions, a mobile project',
    prop: 'play',
    draw: () => {
      const phone = rrect(28, 0, 40, 70, 7);
      const screen = rrect(32, 8, 32, 52, 3);
      const tri: P[] = [
        [44, 26],
        [44, 42],
        [57, 34],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 28)}
              <path d={poly(phone)} className="m-ill__fill-side" />
              <path d={poly(screen)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(phone, true, r, 0.5)} />
              <path d={inked(screen, true, r, 0.35)} className="m-ill__soft" />
              <path
                d={inked(
                  [
                    [44, 4],
                    [52, 4],
                  ],
                  false,
                  r,
                  0.2,
                )}
              />
              <path d={ring(48, 65, 1.8, r, 0.15)} className="m-ill__hair" />
            </>
          ),
        },
        {
          fill: <path d={poly(tri)} className={ACCENT} />,
          line: (r) => <path d={inked(tri, true, r, 0.3)} />,
          move: 'pulse',
          origin: [50, 34],
        },
      ];
    },
  },
  bookmarks: {
    label: 'Bookmarks',
    prop: 'bookmark',
    draw: () => {
      const card = rrect(12, 12, 72, 52, 4);
      const rib: P[] = [
        [62, 6],
        [74, 6],
        [74, 30],
        [68, 25],
        [62, 30],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 38)}
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [22, 26],
                    [52, 26],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [22, 36],
                    [60, 36],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [22, 46],
                    [44, 46],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(rib)} className={ACCENT} />,
          line: (r) => <path d={inked(rib, true, r, 0.4)} />,
          move: 'bob',
          origin: [68, 6],
        },
      ];
    },
  },
  noMatch: {
    label: 'Nothing matches',
    prop: 'magnifier',
    draw: noMatchLayers,
    withRobot: (): Drawing => noMatchLayers().slice(0, 1),
  },
} satisfies Record<string, SubjectDef>;

export const SUBJECTS: typeof BASE_SUBJECTS &
  typeof SUBJECTS_A &
  typeof SUBJECTS_B = { ...BASE_SUBJECTS, ...SUBJECTS_A, ...SUBJECTS_B };

export type SubjectKind = Extract<
  | keyof typeof BASE_SUBJECTS
  | keyof typeof SUBJECTS_A
  | keyof typeof SUBJECTS_B,
  string
>;

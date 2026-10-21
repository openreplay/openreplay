import type { Drawing } from './Inked';
import { type P, inked, poly, ring, rrect } from './ink';
import { ACCENT, PAPER, PROPS, disc } from './props';
import type { SubjectDef } from './subjects';

const shadow = (cx: number, w: number) => (
  <ellipse cx={cx} cy={71} rx={w} ry={2.6} className="m-ill__ground" />
);

const pointer = (x: number, y: number): P[] => [
  [x, y],
  [x, y + 13],
  [x + 3.5, y + 9.5],
  [x + 6.5, y + 15],
  [x + 8.8, y + 14],
  [x + 5.8, y + 8.6],
  [x + 10.2, y + 8.4],
];

export const SUBJECTS_A = {
  listening: {
    label: 'Listening',
    prop: 'stopwatch',
    draw: () => {
      const card = rrect(10, 10, 76, 52, 4);
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
                    [20, 30],
                    [56, 30],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={inked(
                  [
                    [20, 40],
                    [64, 40],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={inked(
                  [
                    [20, 50],
                    [46, 50],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft m-ill__dash"
              />
            </>
          ),
        },
        {
          fill: (
            <>
              <path
                d={poly(disc(72, 22, 7))}
                className="m-ill__fill-accent-soft"
              />
              <path d={poly(disc(72, 22, 3.4))} className={ACCENT} />
            </>
          ),
          line: (r) => <path d={ring(72, 22, 3.4, r, 0.2)} />,
          move: 'pulse',
          origin: [72, 22],
        },
      ];
    },
  },

  segments: {
    label: 'Segments',
    prop: 'bookmark',
    draw: () => {
      const top = rrect(46, 12, 42, 20, 3);
      const bottom = rrect(46, 44, 42, 20, 3);
      return [
        {
          fill: (
            <>
              {shadow(52, 40)}
              <path d={poly(bottom)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path
                d={inked(
                  [
                    [6, 38],
                    [28, 38],
                  ],
                  false,
                  r,
                  0.4,
                )}
              />
              <path
                d={inked(
                  [
                    [28, 38],
                    [38, 24],
                    [46, 22],
                  ],
                  false,
                  r,
                  0.4,
                )}
              />
              <path
                d={inked(
                  [
                    [28, 38],
                    [38, 52],
                    [46, 54],
                  ],
                  false,
                  r,
                  0.4,
                )}
              />
              <path d={inked(bottom, true, r, 0.5)} />
              <path
                d={inked(
                  [
                    [54, 54],
                    [78, 54],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(28, 38, 3.6))} className={ACCENT} />,
          line: (r) => <path d={ring(28, 38, 3.6, r, 0.2)} />,
        },
        {
          fill: <path d={poly(top)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(top, true, r, 0.5)} />
              <path
                d={inked(
                  [
                    [54, 22],
                    [80, 22],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
            </>
          ),
          move: 'bob',
          origin: [67, 22],
        },
      ];
    },
  },

  cobrowse: {
    label: 'CoBrowse',
    prop: 'cursor',
    draw: () => {
      const back = rrect(8, 8, 52, 38, 3);
      const front = rrect(36, 26, 52, 38, 3);
      const cur = pointer(46, 18);
      return [
        {
          fill: (
            <>
              {shadow(48, 42)}
              <path d={poly(back)} className="m-ill__fill-side" />
              <path d={poly(front)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(back, true, r, 0.5)} className="m-ill__soft" />
              <path
                d={inked(
                  [
                    [8, 16],
                    [60, 16],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path d={inked(front, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [36, 34],
                    [88, 34],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
              <path
                d={inked(
                  [
                    [44, 46],
                    [70, 46],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [44, 54],
                    [62, 54],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(cur)} className={ACCENT} />,
          line: (r) => <path d={inked(cur, true, r, 0.3)} />,
          move: 'scan',
          origin: [46, 18],
        },
      ];
    },
  },

  recordedVideos: {
    label: 'Recorded videos',
    prop: 'camera',
    draw: () => {
      const tile = rrect(12, 12, 72, 50, 4);
      const tri: P[] = [
        [42, 28],
        [42, 46],
        [57, 37],
      ];
      const holes = [22, 36, 50, 64, 78];
      return [
        {
          fill: (
            <>
              {shadow(48, 38)}
              <path d={poly(tile)} className={PAPER} />
              <path d={poly(tri)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(tile, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [12, 20],
                    [84, 20],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [12, 54],
                    [84, 54],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              {holes.map((x) => (
                <path
                  key={`t${x}`}
                  d={inked(
                    [
                      [x - 2, 16],
                      [x + 2, 16],
                    ],
                    false,
                    r,
                    0.25,
                  )}
                  className="m-ill__soft m-ill__thick"
                />
              ))}
              {holes.map((x) => (
                <path
                  key={`b${x}`}
                  d={inked(
                    [
                      [x - 2, 58],
                      [x + 2, 58],
                    ],
                    false,
                    r,
                    0.25,
                  )}
                  className="m-ill__soft m-ill__thick"
                />
              ))}
              <path d={inked(tri, true, r, 0.3)} className="m-ill__soft" />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(72, 28, 3.6))} className={ACCENT} />,
          line: (r) => <path d={ring(72, 28, 3.6, r, 0.2)} />,
          move: 'blink',
          origin: [72, 28],
        },
      ];
    },
  },

  spot: {
    label: 'Spot',
    prop: 'puzzle',
    draw: () => {
      const win = rrect(8, 8, 76, 54, 4);
      return [
        {
          fill: (
            <>
              {shadow(50, 42)}
              <path d={poly(win)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(win, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [8, 19],
                    [84, 19],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
              {[15, 21, 27].map((x) => (
                <path
                  key={x}
                  d={ring(x, 13.5, 1.4, r, 0.15)}
                  className="m-ill__soft"
                />
              ))}
              <path
                d={inked(
                  [
                    [18, 32],
                    [50, 32],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [18, 41],
                    [58, 41],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [18, 50],
                    [40, 50],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(76, 13.5, 2.8))} className={ACCENT} />,
          line: (r) => <path d={ring(76, 13.5, 2.8, r, 0.2)} />,
          move: 'blink',
          origin: [76, 13.5],
        },
        {
          fill: (
            <path d={poly(disc(78, 54, 10))} className="m-ill__fill-side" />
          ),
          line: (r) => (
            <>
              <path d={ring(78, 54, 10, r, 0.4)} />
              <path d={ring(78, 54, 4.2, r, 0.25)} />
            </>
          ),
          move: 'bob',
          origin: [78, 54],
        },
      ];
    },
  },

  calendar: {
    label: 'A date window',
    prop: 'calendar',
    draw: () => {
      const page = rrect(16, 12, 64, 54, 4);
      const band: P[] = [
        [16, 16],
        [20, 12],
        [76, 12],
        [80, 16],
        [80, 24],
        [16, 24],
      ];
      const range = rrect(31, 38, 36, 9, 4.5);
      const dots: P[] = [];
      for (const y of [32, 42, 52, 60])
        for (const x of [26, 38, 50, 62, 72]) dots.push([x, y]);
      return [
        {
          fill: (
            <>
              {shadow(48, 36)}
              <path d={poly(page)} className={PAPER} />
              <path d={poly(band)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(page, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [16, 24],
                    [80, 24],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
              <path
                d={inked(
                  [
                    [32, 7],
                    [32, 16],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__thick"
              />
              <path
                d={inked(
                  [
                    [64, 7],
                    [64, 16],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__thick"
              />
              {dots
                .filter(([x, y]) => !(y === 42 && x >= 34 && x <= 64))
                .map(([x, y]) => (
                  <path
                    key={`${x}-${y}`}
                    d={inked(
                      [
                        [x - 0.6, y],
                        [x + 0.6, y],
                      ],
                      false,
                      r,
                      0.2,
                    )}
                    className="m-ill__soft m-ill__thick"
                  />
                ))}
            </>
          ),
        },
        {
          fill: <path d={poly(range)} className="m-ill__fill-accent-soft" />,
          line: (r) => (
            <path d={inked(range, true, r, 0.35)} className="m-ill__accent" />
          ),
          move: 'blink',
          origin: [49, 42.5],
        },
      ];
    },
  },
  calendarWait: {
    label: 'A date window, waited on',
    prop: 'calendar',
    draw: (): Drawing => {
      const [x, y] = [12, 60];
      const at = `translate(${x} ${y})`;
      const watch = PROPS.stopwatch.draw().map((l) => ({
        ...l,
        fill: l.fill ? <g transform={at}>{l.fill}</g> : undefined,
        line: (r: () => number) => <g transform={at}>{l.line(r)}</g>,
        origin: l.origin
          ? ([x + l.origin[0], y + l.origin[1]] as P)
          : undefined,
      }));
      return [
        { fill: shadow(x, 9), line: () => null },
        ...SUBJECTS_A.calendar.draw(),
        ...watch,
      ];
    },
  },

  issues: {
    label: 'Issues',
    prop: 'flag',
    draw: () => {
      const list = rrect(6, 12, 56, 52, 4);
      const cloth: P[] = [
        [76, 18],
        [90, 21],
        [86, 25.5],
        [90, 30],
        [76, 28],
      ];
      return [
        {
          fill: (
            <>
              {shadow(46, 40)}
              <path d={poly(list)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(list, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [14, 26],
                    [44, 26],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [14, 38],
                    [52, 38],
                  ],
                  false,
                  r,
                  0.4,
                )}
              />
              <path
                d={inked(
                  [
                    [14, 50],
                    [38, 50],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [76, 50],
                    [76, 16],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
              <path
                d={inked(
                  [
                    [62, 38],
                    [76, 38],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft m-ill__dash"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(cloth)} className={ACCENT} />,
          line: (r) => <path d={inked(cloth, true, r, 0.35)} />,
          move: 'wave',
          origin: [76, 23],
        },
      ];
    },
  },

  critical: {
    label: 'Critical to you',
    prop: 'star',
    draw: () => {
      const cx = 48;
      const cy = 38;
      return [
        {
          fill: (
            <>
              {shadow(48, 30)}
              <path d={poly(disc(cx, cy, 25))} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={ring(cx, cy, 25, r, 0.55)} />
              <path d={ring(cx, cy, 16, r, 0.45)} className="m-ill__soft" />
              <path
                d={inked(
                  [
                    [cx, cy - 31],
                    [cx, cy - 27],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [cx + 27, cy],
                    [cx + 31, cy],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [cx - 31, cy],
                    [cx - 27, cy],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(cx, cy, 7))} className={ACCENT} />,
          line: (r) => <path d={ring(cx, cy, 7, r, 0.3)} />,
          move: 'pulse',
          origin: [cx, cy],
        },
      ];
    },
  },

  tests: {
    label: 'Synthetic tests',
    prop: 'clipboard',
    draw: () => {
      const sheet = rrect(18, 8, 60, 58, 4);
      const rows = [22, 37, 52];
      const box = (y: number) => rrect(26, y - 5, 10, 10, 2);
      const tick = (y: number): P[] => [
        [28, y],
        [30.5, y + 2.6],
        [34.5, y - 3],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 36)}
              <path d={poly(sheet)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(sheet, true, r, 0.55)} />
              {rows.map((y) => (
                <path key={y} d={inked(box(y), true, r, 0.3)} />
              ))}
              <path d={inked(tick(22), false, r, 0.25)} />
              <path d={inked(tick(37), false, r, 0.25)} />
              <path
                d={inked(
                  [
                    [42, 22],
                    [68, 22],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [42, 37],
                    [64, 37],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [42, 52],
                    [60, 52],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          line: (r) => (
            <path
              d={inked(tick(52), false, r, 0.25)}
              className="m-ill__accent m-ill__thick"
            />
          ),
          move: 'pulse',
          origin: [31, 52],
        },
      ];
    },
  },

  runs: {
    label: 'Runs',
    prop: 'stopwatch',
    draw: () => {
      const cx = 48;
      const cy = 24;
      const card = rrect(4, 1, 88, 64, 5);
      return [
        {
          fill: (
            <>
              {shadow(48, 42)}
              <path d={poly(card)} className={PAPER} />
              <path d={poly(disc(cx, cy, 13))} className={PAPER} />
              {[18, 38, 58].map((x) => (
                <path key={x} d={poly(disc(x, 54, 4))} className={PAPER} />
              ))}
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.45)} />
              <path
                d={inked(
                  [
                    [12, 54],
                    [84, 54],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft"
              />
              {[18, 38, 58].map((x) => (
                <path key={x} d={ring(x, 54, 4, r, 0.25)} />
              ))}
              <path d={ring(cx, cy, 13, r, 0.4)} />
              <path
                d={inked(
                  [
                    [cx - 3, cy - 17],
                    [cx + 3, cy - 17],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__thick"
              />
              <path
                d={inked(
                  [
                    [cx, cy - 16],
                    [cx, cy - 13],
                  ],
                  false,
                  r,
                  0.2,
                )}
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(78, 54, 5))} className={ACCENT} />,
          line: (r) => <path d={ring(78, 54, 5, r, 0.25)} />,
          move: 'pulse',
          origin: [78, 54],
        },
        {
          line: (r) => (
            <path
              d={inked(
                [
                  [cx, cy],
                  [cx + 6, cy - 6],
                ],
                false,
                r,
                0.2,
              )}
              className="m-ill__thick"
            />
          ),
          move: 'spin',
          origin: [cx, cy],
        },
      ];
    },
  },

  environments: {
    label: 'Environments',
    prop: 'plug',
    draw: () => {
      const bar = rrect(30, 8, 60, 14, 7);
      const rackA = rrect(10, 30, 46, 16, 3);
      const rackB = rrect(10, 50, 46, 16, 3);
      return [
        {
          fill: (
            <>
              {shadow(46, 40)}
              <path d={poly(bar)} className={PAPER} />
              <path d={poly(rackA)} className={PAPER} />
              <path d={poly(rackB)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(bar, true, r, 0.45)} />
              <path d={ring(39, 15, 4, r, 0.25)} />
              <path
                d={inked(
                  [
                    [35, 15],
                    [43, 15],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [39, 11],
                    [39, 19],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [48, 15],
                    [80, 15],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
              <path d={inked(rackA, true, r, 0.45)} />
              <path d={inked(rackB, true, r, 0.45)} />
              <path
                d={inked(
                  [
                    [18, 38],
                    [36, 38],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [18, 58],
                    [36, 58],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
              <path d={ring(48, 58, 1.8, r, 0.15)} className="m-ill__soft" />
              <path
                d={inked(
                  [
                    [56, 38],
                    [68, 38],
                    [68, 22],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft m-ill__dash"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(48, 38, 2.4))} className={ACCENT} />,
          line: (r) => <path d={ring(48, 38, 2.4, r, 0.15)} />,
          move: 'blink',
          origin: [48, 38],
        },
      ];
    },
  },

  audits: {
    label: 'Audits',
    prop: 'clipboard',
    draw: () => {
      const board = rrect(14, 12, 52, 56, 4);
      const clip = rrect(30, 7, 20, 9, 2);
      const squig = (x: number, y: number): P[] => [
        [x, y],
        [x + 3, y - 2.5],
        [x + 6, y],
        [x + 9, y - 2.5],
        [x + 12, y],
      ];
      return [
        {
          fill: (
            <>
              {shadow(46, 36)}
              <path d={poly(board)} className={PAPER} />
              <path d={poly(clip)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(board, true, r, 0.55)} />
              <path d={inked(clip, true, r, 0.3)} />
              <path
                d={inked(squig(22, 28), false, r, 0.3)}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [38, 27],
                    [56, 27],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [22, 40],
                    [36, 40],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [22, 52],
                    [50, 52],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(66, 42, 12))} className={PAPER} />,
          line: (r) => (
            <>
              <path
                d={inked(squig(60, 43), false, r, 0.3)}
                className="m-ill__accent m-ill__thick"
              />
              <path d={ring(66, 42, 12, r, 0.45)} />
              <path
                d={inked(
                  [
                    [74.5, 50.5],
                    [86, 62],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__thick"
              />
            </>
          ),
          move: 'scan',
          origin: [66, 42],
        },
      ];
    },
  },

  dashboards: {
    label: 'Dashboards',
    prop: 'chart',
    draw: () => {
      const tiles = [
        rrect(8, 8, 38, 28, 3),
        rrect(50, 8, 38, 28, 3),
        rrect(8, 40, 38, 28, 3),
        rrect(50, 40, 38, 28, 3),
      ];
      const bars: P[][] = [
        [
          [57, 30],
          [57, 22],
          [62, 22],
          [62, 30],
        ],
        [
          [66, 30],
          [66, 16],
          [71, 16],
          [71, 30],
        ],
        [
          [75, 30],
          [75, 19],
          [80, 19],
          [80, 30],
        ],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 42)}
              {tiles.map((t, i) => (
                <path key={i} d={poly(t)} className={PAPER} />
              ))}
            </>
          ),
          line: (r) => (
            <>
              {tiles.map((t, i) => (
                <path key={i} d={inked(t, true, r, 0.45)} />
              ))}
              <path
                d={inked(
                  [
                    [14, 28],
                    [22, 20],
                    [30, 24],
                    [40, 14],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              <path d={ring(27, 54, 8, r, 0.35)} className="m-ill__soft" />
              <path
                d={inked(
                  [
                    [58, 50],
                    [80, 50],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
              <path
                d={inked(
                  [
                    [58, 58],
                    [72, 58],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
        {
          fill: (
            <>
              {bars.map((b, i) => (
                <path key={i} d={poly(b)} className={ACCENT} />
              ))}
            </>
          ),
          line: (r) => (
            <>
              {bars.map((b, i) => (
                <path key={i} d={inked(b, false, r, 0.25)} />
              ))}
            </>
          ),
          move: 'bob',
          origin: [68, 30],
        },
      ];
    },
  },

  dashboardEmpty: {
    label: 'An empty dashboard',
    prop: 'chart',
    draw: () => {
      const tiles = [
        rrect(8, 8, 38, 28, 3),
        rrect(50, 8, 38, 28, 3),
        rrect(8, 40, 38, 28, 3),
      ];
      const slot = rrect(50, 40, 38, 28, 3);
      return [
        {
          fill: (
            <>
              {shadow(48, 42)}
              {tiles.map((t, i) => (
                <path key={i} d={poly(t)} className="m-ill__fill-top" />
              ))}
              <path d={poly(slot)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              {tiles.map((t, i) => (
                <path
                  key={i}
                  d={inked(t, true, r, 0.4)}
                  className="m-ill__soft m-ill__dash"
                />
              ))}
              <path d={inked(slot, true, r, 0.45)} className="m-ill__dash" />
            </>
          ),
        },
        {
          line: (r) => (
            <>
              <path
                d={inked(
                  [
                    [69, 47],
                    [69, 61],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__accent m-ill__thick"
              />
              <path
                d={inked(
                  [
                    [62, 54],
                    [76, 54],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__accent m-ill__thick"
              />
            </>
          ),
          move: 'pulse',
          origin: [69, 54],
        },
      ];
    },
  },
} satisfies Record<string, SubjectDef>;

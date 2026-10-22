import { useId } from 'react';

import { type Drawing, Inked } from './Inked';
import './illustration.css';
import { ACCENT, type P, PAPER, disc, inked, poly, ring, rrect } from './ink';

const ground = (cx: number, w: number) => (
  <ellipse cx={cx} cy={36.5} rx={w} ry={1.8} className="m-ill__ground" />
);
const line = (pts: P[], r: () => number, amp = 0.3) =>
  inked(pts, false, r, amp);

const MARKS = {
  calendar: {
    label: 'A window of time',
    draw: (): Drawing => {
      const body = rrect(9, 8, 30, 26, 3);
      return [
        {
          fill: (
            <>
              {ground(24, 15)}
              <path d={poly(body)} className={PAPER} />
              <path
                d={poly([
                  [9, 11],
                  [39, 11],
                  [39, 15],
                  [9, 15],
                ])}
                className="m-ill__fill-accent-soft"
              />
              <path d={poly(disc(29, 25, 2.2, 10))} className={ACCENT} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(body, true, r, 0.35)} />
              <path
                d={line(
                  [
                    [9, 15],
                    [39, 15],
                  ],
                  r,
                )}
              />
              <path
                d={line(
                  [
                    [16, 5],
                    [16, 10],
                  ],
                  r,
                )}
                className="m-ill__thick"
              />
              <path
                d={line(
                  [
                    [32, 5],
                    [32, 10],
                  ],
                  r,
                )}
                className="m-ill__thick"
              />
              {[19, 24].map((x) => (
                <path
                  key={x}
                  d={line(
                    [
                      [x, 25],
                      [x + 0.2, 25],
                    ],
                    r,
                    0.1,
                  )}
                  className="m-ill__soft m-ill__thick"
                />
              ))}
              {[15, 19, 24, 29].map((x) => (
                <path
                  key={`b${x}`}
                  d={line(
                    [
                      [x, 30],
                      [x + 0.2, 30],
                    ],
                    r,
                    0.1,
                  )}
                  className="m-ill__soft m-ill__thick"
                />
              ))}
            </>
          ),
        },
      ];
    },
  },
  noMatch: {
    label: 'Nothing matches',
    draw: (): Drawing => {
      const card = rrect(7, 9, 26, 24, 3);
      return [
        {
          fill: (
            <>
              {ground(24, 15)}
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.35)} />
              {[16, 22, 28].map((y) => (
                <path
                  key={y}
                  d={line(
                    [
                      [12, y],
                      [27, y],
                    ],
                    r,
                  )}
                  className="m-ill__soft m-ill__dash"
                />
              ))}
            </>
          ),
        },
        {
          fill: <path d={poly(disc(32, 22, 7, 12))} className={PAPER} />,
          line: (r) => (
            <>
              <path d={ring(32, 22, 7, r, 0.3)} />
              <path
                d={line(
                  [
                    [37, 27],
                    [42, 32],
                  ],
                  r,
                )}
                className="m-ill__thick"
              />
              <path
                d={line(
                  [
                    [29, 20],
                    [31, 17.6],
                  ],
                  r,
                  0.2,
                )}
                className="m-ill__accent m-ill__hair"
              />
            </>
          ),
        },
      ];
    },
  },
  funnel: {
    label: 'Steps not set',
    draw: (): Drawing => [
      {
        fill: (
          <>
            {ground(24, 13)}
            <path
              d={poly([
                [8, 7],
                [40, 7],
                [36, 15],
                [12, 15],
              ])}
              className={PAPER}
            />
            <path
              d={poly([
                [13, 18],
                [35, 18],
                [32, 25],
                [16, 25],
              ])}
              className={PAPER}
            />
            <path
              d={poly([
                [18, 28],
                [30, 28],
                [28, 34],
                [20, 34],
              ])}
              className={ACCENT}
            />
          </>
        ),
        line: (r) => (
          <>
            <path
              d={inked(
                [
                  [8, 7],
                  [40, 7],
                  [36, 15],
                  [12, 15],
                ],
                true,
                r,
                0.3,
              )}
            />
            <path
              d={inked(
                [
                  [13, 18],
                  [35, 18],
                  [32, 25],
                  [16, 25],
                ],
                true,
                r,
                0.3,
              )}
              className="m-ill__soft m-ill__dash"
            />
            <path
              d={inked(
                [
                  [18, 28],
                  [30, 28],
                  [28, 34],
                  [20, 34],
                ],
                true,
                r,
                0.3,
              )}
              className="m-ill__soft m-ill__dash"
            />
          </>
        ),
      },
    ],
  },
  heatmap: {
    label: 'A page to read',
    draw: (): Drawing => {
      const page = rrect(8, 6, 32, 28, 3);
      return [
        {
          fill: (
            <>
              {ground(24, 15)}
              <path d={poly(page)} className={PAPER} />
              <path
                d={poly(disc(18, 19, 4.5, 12))}
                className="m-ill__fill-accent-soft"
              />
              <path
                d={poly(disc(30, 26, 3.5, 12))}
                className="m-ill__fill-accent-soft"
              />
              <path d={poly(disc(18, 19, 1.8, 10))} className={ACCENT} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(page, true, r, 0.35)} />
              <path
                d={line(
                  [
                    [8, 12],
                    [40, 12],
                  ],
                  r,
                )}
                className="m-ill__soft"
              />
              <path
                d={line(
                  [
                    [26, 17],
                    [34, 17],
                  ],
                  r,
                )}
                className="m-ill__soft m-ill__hair"
              />
            </>
          ),
        },
      ];
    },
  },
  console: {
    label: 'Nothing logged',
    draw: (): Drawing => {
      const win = rrect(7, 7, 34, 27, 3);
      return [
        {
          fill: (
            <>
              {ground(24, 16)}
              <path d={poly(win)} className={PAPER} />
              <path
                d={poly([
                  [7, 10],
                  [41, 10],
                  [41, 13],
                  [7, 13],
                ])}
                className="m-ill__fill-top"
              />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(win, true, r, 0.35)} />
              <path
                d={line(
                  [
                    [7, 13],
                    [41, 13],
                  ],
                  r,
                )}
              />
              <path
                d={line(
                  [
                    [13, 19],
                    [17, 22.5],
                    [13, 26],
                  ],
                  r,
                )}
                className="m-ill__accent"
              />
              <path
                d={line(
                  [
                    [20, 27],
                    [27, 27],
                  ],
                  r,
                )}
                className="m-ill__soft"
              />
            </>
          ),
        },
      ];
    },
  },
  network: {
    label: 'No requests',
    draw: (): Drawing => [
      {
        fill: ground(24, 13),
        line: (r) => (
          <>
            <path
              d={line(
                [
                  [18, 31],
                  [18, 9],
                ],
                r,
              )}
            />
            <path
              d={line(
                [
                  [12, 15],
                  [18, 9],
                  [24, 15],
                ],
                r,
              )}
            />
            <path
              d={line(
                [
                  [30, 9],
                  [30, 31],
                ],
                r,
              )}
              className="m-ill__accent"
            />
            <path
              d={line(
                [
                  [24, 25],
                  [30, 31],
                  [36, 25],
                ],
                r,
              )}
              className="m-ill__accent"
            />
          </>
        ),
      },
    ],
  },
  layers: {
    label: 'No state found',
    draw: (): Drawing => {
      const sheet = (y: number): P[] => [
        [24, y],
        [40, y + 7],
        [24, y + 14],
        [8, y + 7],
      ];
      return [
        {
          fill: (
            <>
              {ground(24, 15)}
              <path d={poly(sheet(18))} className={PAPER} />
              <path d={poly(sheet(12))} className={PAPER} />
              <path d={poly(sheet(6))} className="m-ill__fill-accent-soft" />
            </>
          ),
          line: (r) => (
            <>
              <path
                d={inked(sheet(18), true, r, 0.3)}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={inked(sheet(12), true, r, 0.3)}
                className="m-ill__soft"
              />
              <path d={inked(sheet(6), true, r, 0.3)} />
            </>
          ),
        },
      ];
    },
  },
  events: {
    label: 'No events',
    draw: (): Drawing => {
      const bolt: P[] = [
        [27, 5],
        [14, 21],
        [23, 21],
        [20, 34],
        [34, 16],
        [25, 16],
      ];
      return [
        {
          fill: (
            <>
              {ground(24, 11)}
              <path d={poly(bolt)} className="m-ill__fill-accent-soft" />
            </>
          ),
          line: (r) => <path d={inked(bolt, true, r, 0.3)} />,
        },
      ];
    },
  },
  traces: {
    label: 'No backend logs',
    draw: (): Drawing => {
      const sheet = rrect(11, 6, 26, 28, 2);
      return [
        {
          fill: (
            <>
              {ground(24, 14)}
              <path d={poly(sheet)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(sheet, true, r, 0.35)} />
              <path
                d={line(
                  [
                    [16, 13],
                    [32, 13],
                  ],
                  r,
                )}
              />
              <path
                d={line(
                  [
                    [16, 19],
                    [28, 19],
                  ],
                  r,
                )}
                className="m-ill__soft"
              />
              <path
                d={line(
                  [
                    [20, 25],
                    [32, 25],
                  ],
                  r,
                )}
                className="m-ill__soft"
              />
              <path
                d={line(
                  [
                    [16, 25],
                    [17, 25],
                  ],
                  r,
                  0.1,
                )}
                className="m-ill__accent m-ill__thick"
              />
            </>
          ),
        },
      ];
    },
  },
  activity: {
    label: 'Nothing recorded',
    draw: (): Drawing => [
      {
        fill: (
          <>
            {ground(24, 14)}
            {[10, 19, 28].map((y, i) => (
              <path
                key={y}
                d={poly(disc(12, y, 2.4, 10))}
                className={i === 0 ? ACCENT : PAPER}
              />
            ))}
          </>
        ),
        line: (r) => (
          <>
            <path
              d={line(
                [
                  [12, 12.5],
                  [12, 25.5],
                ],
                r,
              )}
              className="m-ill__soft m-ill__hair"
            />
            {[19, 28].map((y) => (
              <path
                key={y}
                d={ring(12, y, 2.4, r, 0.15)}
                className="m-ill__soft"
              />
            ))}
            <path
              d={line(
                [
                  [19, 10],
                  [37, 10],
                ],
                r,
              )}
            />
            <path
              d={line(
                [
                  [19, 19],
                  [33, 19],
                ],
                r,
              )}
              className="m-ill__soft m-ill__dash"
            />
            <path
              d={line(
                [
                  [19, 28],
                  [30, 28],
                ],
                r,
              )}
              className="m-ill__soft m-ill__dash"
            />
          </>
        ),
      },
    ],
  },
  features: {
    label: 'Nothing tagged',
    draw: (): Drawing => {
      const box = rrect(8, 7, 26, 22, 2);
      const arrow: P[] = [
        [27, 20],
        [39, 26],
        [33.5, 27.5],
        [31, 33],
      ];
      return [
        {
          fill: (
            <>
              {ground(24, 14)}
              <path d={poly(arrow)} className={ACCENT} />
            </>
          ),
          line: (r) => (
            <>
              <path
                d={inked(box, true, r, 0.3)}
                className="m-ill__soft m-ill__dash"
              />
              <path d={inked(arrow, true, r, 0.25)} />
            </>
          ),
        },
      ];
    },
  },
  comments: {
    label: 'No comments',
    draw: (): Drawing => {
      const bubble: P[] = [
        [10, 8],
        [38, 8],
        [41, 11],
        [41, 24],
        [38, 27],
        [22, 27],
        [15, 33],
        [16, 27],
        [10, 27],
        [7, 24],
        [7, 11],
      ];
      return [
        {
          fill: (
            <>
              {ground(24, 14)}
              <path d={poly(bubble)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(bubble, true, r, 0.3)} />
              <path
                d={line(
                  [
                    [14, 15],
                    [33, 15],
                  ],
                  r,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={line(
                  [
                    [14, 20],
                    [26, 20],
                  ],
                  r,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={line(
                  [
                    [30, 20],
                    [31, 20],
                  ],
                  r,
                  0.1,
                )}
                className="m-ill__accent m-ill__thick"
              />
            </>
          ),
        },
      ];
    },
  },
  recordings: {
    label: 'No recordings',
    draw: (): Drawing => {
      const screen = rrect(7, 7, 34, 25, 3);
      const play: P[] = [
        [21, 14],
        [30, 19.5],
        [21, 25],
      ];
      return [
        {
          fill: (
            <>
              {ground(24, 16)}
              <path d={poly(screen)} className={PAPER} />
              <path d={poly(play)} className="m-ill__fill-accent-soft" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(screen, true, r, 0.35)} />
              <path d={inked(play, true, r, 0.2)} className="m-ill__accent" />
              <path
                d={line(
                  [
                    [12, 29],
                    [36, 29],
                  ],
                  r,
                )}
                className="m-ill__soft m-ill__hair"
              />
            </>
          ),
        },
      ];
    },
  },
  invoice: {
    label: 'No invoice',
    draw: (): Drawing => {
      const sheet: P[] = [
        [12, 5],
        [36, 5],
        [36, 33],
        [32, 30.5],
        [28, 33],
        [24, 30.5],
        [20, 33],
        [16, 30.5],
        [12, 33],
      ];
      return [
        {
          fill: (
            <>
              {ground(24, 13)}
              <path d={poly(sheet)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(sheet, true, r, 0.3)} />
              <path
                d={line(
                  [
                    [17, 12],
                    [31, 12],
                  ],
                  r,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={line(
                  [
                    [17, 18],
                    [27, 18],
                  ],
                  r,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={line(
                  [
                    [25, 24],
                    [31, 24],
                  ],
                  r,
                )}
                className="m-ill__accent m-ill__thick"
              />
            </>
          ),
        },
      ];
    },
  },
  synthetics: {
    label: 'Synthetics',
    draw: (): Drawing => {
      const board = rrect(11, 8, 26, 27, 3);
      const clip = rrect(19, 5, 10, 5, 1.5);
      const tick: P[] = [
        [16, 28.5],
        [18.5, 31],
        [23, 25.5],
      ];
      return [
        {
          fill: (
            <>
              {ground(24, 15)}
              <path d={poly(board)} className={PAPER} />
              <path d={poly(clip)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(board, true, r, 0.35)} />
              <path d={inked(clip, true, r, 0.25)} />
              <path
                d={line(
                  [
                    [16, 16],
                    [32, 16],
                  ],
                  r,
                )}
                className="m-ill__soft"
              />
              <path
                d={line(
                  [
                    [16, 22],
                    [32, 22],
                  ],
                  r,
                )}
                className="m-ill__soft"
              />
              <path
                d={line(
                  [
                    [26, 28.5],
                    [32, 28.5],
                  ],
                  r,
                )}
                className="m-ill__soft"
              />
              <path
                d={line(tick, r, 0.2)}
                className="m-ill__accent m-ill__thick"
              />
            </>
          ),
        },
      ];
    },
  },
} satisfies Record<string, { label: string; draw: () => Drawing }>;

export type MarkKind = keyof typeof MARKS;
export const MARK_KINDS = Object.keys(MARKS) as MarkKind[];
export const markLabel = (k: MarkKind) => MARKS[k].label;

/** A quiet mark: one object in the illustrations' ink, still, no robot. */
export function Mark({
  kind,
  width = 56,
  className,
}: {
  kind: MarkKind;
  width?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const rough = (k: number) => `url(#mk-rough-${uid}-${k})`;
  return (
    <span
      className={`m-ill m-ill--mark${className ? ` ${className}` : ''}`}
      style={{ width, aspectRatio: '48 / 40' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 40" className="m-ill__svg" fill="none">
        <defs>
          {[0, 1, 2].map((k) => (
            <filter
              key={k}
              id={`mk-rough-${uid}-${k}`}
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                seed={3 + k * 11}
                result="n"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="n"
                scale="1.1"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>
        <Inked drawing={MARKS[kind].draw()} rough={rough} hand={7} />
      </svg>
    </span>
  );
}

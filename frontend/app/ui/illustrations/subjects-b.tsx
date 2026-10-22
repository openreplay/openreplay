import { ACCENT, type P, PAPER, disc, inked, poly, ring, rrect } from './ink';
import { shadow } from './props';
import type { SubjectDef } from './subjects';

const SOFT = 'm-ill__fill-accent-soft';

export const SUBJECTS_B = {
  cards: {
    label: 'Cards',
    prop: 'chart',
    draw: () => {
      const card = rrect(10, 8, 76, 58, 4);
      const bars: [number, number][] = [
        [22, 46],
        [34, 40],
        [58, 50],
      ];
      const tall = rrect(46, 28, 8, 30, 1.5);
      return [
        {
          fill: (
            <>
              {shadow(48, 40)}
              <path d={poly(card)} className={PAPER} />
              {bars.map(([x, y]) => (
                <path
                  key={x}
                  d={poly(rrect(x, y, 8, 58 - y, 1.5))}
                  className="m-ill__fill-side"
                />
              ))}
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [18, 18],
                    [50, 18],
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
                    [16, 58],
                    [80, 58],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__soft"
              />
              {bars.map(([x, y]) => (
                <path
                  key={x}
                  d={inked(rrect(x, y, 8, 58 - y, 1.5), true, r, 0.35)}
                />
              ))}
            </>
          ),
        },
        {
          fill: <path d={poly(tall)} className={ACCENT} />,
          line: (r) => <path d={inked(tall, true, r, 0.35)} />,
          move: 'pulse',
          origin: [50, 58],
        },
      ];
    },
  },
  chart: {
    label: 'No data in this window',
    prop: 'calendar',
    draw: () => {
      const card = rrect(6, 6, 84, 60, 4);
      const win = rrect(52, 12, 26, 44, 2);
      return [
        {
          fill: (
            <>
              {shadow(48, 42)}
              <path d={poly(card)} className={PAPER} />
              <path d={poly(win)} className={SOFT} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [16, 14],
                    [16, 56],
                    [82, 56],
                  ],
                  false,
                  r,
                  0.45,
                )}
              />
              <path
                d={inked(
                  [
                    [20, 44],
                    [80, 44],
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
          fill: <path d={poly(disc(56, 44, 3.2))} className={ACCENT} />,
          line: (r) => (
            <path d={ring(56, 44, 3.2, r, 0.2)} className="m-ill__hair" />
          ),
          move: 'scrub',
          origin: [56, 44],
        },
      ];
    },
  },
  alerts: {
    label: 'Alerts',
    prop: 'bell',
    draw: () => {
      const card = rrect(6, 24, 62, 42, 4);
      const bell: P[] = [
        [66, 30],
        [68, 20],
        [71, 15],
        [79, 15],
        [82, 20],
        [84, 30],
      ];
      return [
        {
          fill: (
            <>
              {shadow(44, 38)}
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [12, 42],
                    [62, 42],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={inked(
                  [
                    [14, 58],
                    [26, 52],
                    [36, 54],
                    [46, 42],
                    [56, 34],
                  ],
                  false,
                  r,
                  0.45,
                )}
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(46, 42, 3.6))} className={ACCENT} />,
          line: (r) => (
            <path d={ring(46, 42, 3.6, r, 0.2)} className="m-ill__hair" />
          ),
          move: 'pulse',
          origin: [46, 42],
        },
        {
          fill: <path d={poly(bell)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(bell, true, r, 0.4)} />
              <path d={ring(75, 13, 1.5, r, 0.2)} />
              <path d={ring(75, 33, 2, r, 0.2)} />
            </>
          ),
          move: 'ring',
          origin: [75, 12],
        },
      ];
    },
  },
  activity: {
    label: 'Activity',
    prop: 'cursor',
    draw: () => {
      const card = rrect(14, 6, 68, 60, 4);
      const rows: [number, number][] = [
        [28, 66],
        [40, 60],
        [52, 70],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 36)}
              <path d={poly(card)} className={PAPER} />
              {rows.map(([y]) => (
                <path key={y} d={poly(disc(26, y, 2.6))} className={PAPER} />
              ))}
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [26, 20],
                    [26, 56],
                  ],
                  false,
                  r,
                  0.35,
                )}
                className="m-ill__soft"
              />
              {rows.map(([y, end]) => (
                <g key={y}>
                  <path d={ring(26, y, 2.6, r, 0.2)} />
                  <path
                    d={inked(
                      [
                        [34, y],
                        [end, y],
                      ],
                      false,
                      r,
                      0.35,
                    )}
                    className="m-ill__soft"
                  />
                </g>
              ))}
            </>
          ),
        },
        {
          fill: <path d={poly(disc(26, 16, 3.6))} className={ACCENT} />,
          line: (r) => (
            <>
              <path d={ring(26, 16, 3.6, r, 0.2)} className="m-ill__hair" />
              <path
                d={inked(
                  [
                    [34, 16],
                    [42, 16],
                    [46, 11],
                    [50, 21],
                    [54, 16],
                    [70, 16],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
            </>
          ),
          move: 'pulse',
          origin: [26, 16],
        },
      ];
    },
  },
  events: {
    label: 'Events',
    prop: 'tag',
    draw: () => {
      const row = (y: number) => rrect(10, y, 76, 15, 3);
      return [
        {
          fill: (
            <>
              {shadow(48, 40)}
              <path d={poly(row(32))} className={PAPER} />
              <path d={poly(row(50))} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              {[32, 50].map((y) => (
                <g key={y}>
                  <path d={inked(row(y), true, r, 0.45)} />
                  <path
                    d={ring(19, y + 7.5, 2.6, r, 0.2)}
                    className="m-ill__soft"
                  />
                  <path
                    d={inked(
                      [
                        [28, y + 7.5],
                        [y === 32 ? 66 : 56, y + 7.5],
                      ],
                      false,
                      r,
                      0.35,
                    )}
                    className="m-ill__soft"
                  />
                </g>
              ))}
            </>
          ),
        },
        {
          fill: (
            <>
              <path d={poly(row(14))} className={PAPER} />
              <path d={poly(disc(19, 21.5, 3.4))} className={ACCENT} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(row(14), true, r, 0.45)} />
              <path d={ring(19, 21.5, 3.4, r, 0.2)} className="m-ill__hair" />
              <path
                d={inked(
                  [
                    [28, 21.5],
                    [62, 21.5],
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
          origin: [48, 21],
        },
      ];
    },
  },
  properties: {
    label: 'Properties',
    prop: 'tag',
    draw: () => {
      const key: P[] = [
        [12, 12],
        [50, 12],
        [58, 21],
        [50, 30],
        [12, 30],
      ];
      const value: P[] = [
        [34, 40],
        [74, 40],
        [82, 49],
        [74, 58],
        [34, 58],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 36)}
              <path d={poly(key)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(key, true, r, 0.45)} />
              <path d={ring(50, 21, 1.8, r, 0.2)} />
              <path
                d={inked(
                  [
                    [18, 21],
                    [40, 21],
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
                    [50, 23],
                    [44, 34],
                    [38, 40],
                  ],
                  false,
                  r,
                  0.4,
                )}
                className="m-ill__hair"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(value)} className={ACCENT} />,
          line: (r) => (
            <>
              <path d={inked(value, true, r, 0.45)} />
              <path d={ring(74, 49, 1.8, r, 0.2)} />
            </>
          ),
          move: 'swing',
          origin: [36, 40],
        },
      ];
    },
  },
  features: {
    label: 'Features',
    prop: 'cursor',
    draw: () => {
      const button = rrect(12, 30, 54, 20, 6);
      const tag: P[] = [
        [58, 6],
        [78, 6],
        [84, 12],
        [78, 18],
        [58, 18],
      ];
      const cursor: P[] = [
        [52, 42],
        [52, 63],
        [57, 58],
        [61, 66],
        [64.5, 64.5],
        [60.5, 56.5],
        [67.5, 56.5],
      ];
      return [
        {
          fill: (
            <>
              {shadow(46, 36)}
              <path d={poly(button)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(button, true, r, 0.45)} />
              <path
                d={inked(
                  [
                    [22, 40],
                    [44, 40],
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
                    [62, 18],
                    [60, 30],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__hair"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(tag)} className={ACCENT} />,
          line: (r) => (
            <>
              <path d={inked(tag, true, r, 0.4)} />
              <path d={ring(78, 12, 1.5, r, 0.2)} />
            </>
          ),
          move: 'swing',
          origin: [60, 12],
        },
        {
          fill: <path d={poly(cursor)} className={PAPER} />,
          line: (r) => <path d={inked(cursor, true, r, 0.35)} />,
          move: 'bob',
          origin: [52, 42],
        },
      ];
    },
  },
  people: {
    label: 'People',
    prop: 'envelope',
    draw: () => {
      const body = (x: number): P[] => [
        [x - 11, 62],
        [x - 11, 54],
        [x - 6, 47],
        [x + 6, 47],
        [x + 11, 54],
        [x + 11, 62],
      ];
      const person = (x: number, fillCls: string) => ({
        fill: (
          <>
            <path d={poly(body(x))} className={fillCls} />
            <path d={poly(disc(x, 36, 7))} className={PAPER} />
          </>
        ),
        line: (r: () => number) => (
          <>
            <path d={inked(body(x), true, r, 0.4)} />
            <path d={ring(x, 36, 7, r, 0.35)} />
          </>
        ),
      });
      return [
        {
          fill: shadow(48, 38),
          line: (r) => (
            <path
              d={inked(
                [
                  [34, 68],
                  [62, 68],
                ],
                false,
                r,
                0.3,
              )}
              className="m-ill__soft"
            />
          ),
        },
        person(24, 'm-ill__fill-side'),
        person(72, 'm-ill__fill-side'),
        { ...person(48, ACCENT), move: 'bob', origin: [48, 62] },
      ];
    },
  },
  exports: {
    label: 'Exports',
    prop: 'box',
    draw: () => {
      const front: P[] = [
        [16, 38],
        [56, 38],
        [56, 66],
        [16, 66],
      ];
      const side: P[] = [
        [56, 38],
        [70, 30],
        [70, 58],
        [56, 66],
      ];
      const top: P[] = [
        [16, 38],
        [30, 30],
        [70, 30],
        [56, 38],
      ];
      const file = rrect(38, 4, 30, 22, 3);
      const tri: P[] = [
        [50, 10],
        [50, 20],
        [58, 15],
      ];
      return [
        {
          fill: (
            <>
              {shadow(44, 32)}
              <path d={poly(top)} className="m-ill__fill-top" />
              <path d={poly(front)} className="m-ill__fill-front" />
              <path d={poly(side)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path
                d={inked(
                  [
                    [16, 38],
                    [30, 30],
                    [70, 30],
                    [70, 58],
                    [56, 66],
                    [16, 66],
                  ],
                  true,
                  r,
                  0.5,
                )}
              />
              <path
                d={inked(
                  [
                    [16, 38],
                    [56, 38],
                    [70, 30],
                  ],
                  false,
                  r,
                  0.45,
                )}
              />
              <path
                d={inked(
                  [
                    [56, 38],
                    [56, 66],
                  ],
                  false,
                  r,
                  0.45,
                )}
              />
              <path
                d={inked(
                  [
                    [30, 52],
                    [42, 52],
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
          fill: (
            <>
              <path d={poly(file)} className={PAPER} />
              <path d={poly(tri)} className={ACCENT} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(file, true, r, 0.4)} />
              <path d={inked(tri, true, r, 0.3)} />
              <path
                d={inked(
                  [
                    [76, 22],
                    [82, 14],
                    [82, 20],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [82, 14],
                    [76, 14],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__hair"
              />
            </>
          ),
          move: 'rise',
          origin: [53, 15],
        },
      ];
    },
  },
  keys: {
    label: 'Metadata keys',
    prop: 'key',
    draw: () => {
      const card = rrect(48, 36, 40, 32, 3);
      return [
        {
          fill: (
            <>
              {shadow(52, 38)}
              <path d={poly(card)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.45)} />
              {[45, 52, 59].map((y, i) => (
                <g key={y}>
                  <path d={ring(55, y, 1.6, r, 0.2)} className="m-ill__soft" />
                  <path
                    d={inked(
                      [
                        [60, y],
                        [i === 1 ? 74 : 80, y],
                      ],
                      false,
                      r,
                      0.3,
                    )}
                    className="m-ill__soft"
                  />
                </g>
              ))}
            </>
          ),
        },
        {
          fill: (
            <>
              <path d={poly(disc(22, 26, 10))} className={PAPER} />
              <path d={poly(disc(21, 26, 4))} className={ACCENT} />
            </>
          ),
          line: (r) => (
            <>
              <path d={ring(22, 26, 10, r, 0.4)} />
              <path d={ring(21, 26, 4, r, 0.2)} className="m-ill__hair" />
              <path
                d={inked(
                  [
                    [32, 26],
                    [62, 26],
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
                    [54, 26],
                    [54, 33],
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
                    [60, 26],
                    [60, 31],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__thick"
              />
            </>
          ),
          move: 'tilt',
          origin: [22, 26],
        },
      ];
    },
  },
  webhooks: {
    label: 'Webhooks',
    prop: 'plug',
    draw: () => {
      const plug = rrect(12, 30, 20, 16, 3);
      const socket = rrect(58, 24, 26, 28, 4);
      return [
        {
          fill: (
            <>
              {shadow(48, 38)}
              <path d={poly(socket)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(socket, true, r, 0.45)} />
              <path
                d={inked(
                  [
                    [66, 33],
                    [66, 37],
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
                    [66, 40],
                    [66, 44],
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
                    [71, 52],
                    [71, 60],
                    [80, 64],
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
          fill: <path d={poly(disc(78, 29, 2.4))} className={ACCENT} />,
          line: (r) => (
            <path d={ring(78, 29, 2.4, r, 0.2)} className="m-ill__hair" />
          ),
          move: 'connect',
          origin: [78, 29],
        },
        {
          fill: <path d={poly(plug)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(plug, true, r, 0.4)} />
              <path
                d={inked(
                  [
                    [32, 34],
                    [39, 34],
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
                    [32, 42],
                    [39, 42],
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
                    [12, 38],
                    [6, 46],
                    [8, 58],
                    [24, 64],
                  ],
                  false,
                  r,
                  0.45,
                )}
              />
            </>
          ),
          move: 'plugIn',
          origin: [22, 38],
        },
      ];
    },
  },
  invoices: {
    label: 'Invoices',
    prop: 'calendar',
    draw: () => {
      const paper: P[] = [
        [24, 6],
        [72, 6],
        [72, 62],
        [66, 58],
        [60, 62],
        [54, 58],
        [48, 62],
        [42, 58],
        [36, 62],
        [30, 58],
        [24, 62],
      ];
      return [
        {
          fill: (
            <>
              {shadow(48, 30)}
              <path d={poly(paper)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(paper, true, r, 0.45)} />
              <path
                d={inked(
                  [
                    [32, 16],
                    [52, 16],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
              {[26, 33].map((y) => (
                <g key={y}>
                  <path
                    d={inked(
                      [
                        [32, y],
                        [48, y],
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
                        [58, y],
                        [64, y],
                      ],
                      false,
                      r,
                      0.3,
                    )}
                    className="m-ill__soft"
                  />
                </g>
              ))}
              <path
                d={inked(
                  [
                    [32, 41],
                    [64, 41],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft m-ill__dash"
              />
              <path
                d={inked(
                  [
                    [32, 49],
                    [42, 49],
                  ],
                  false,
                  r,
                  0.3,
                )}
              />
            </>
          ),
        },
        {
          fill: <path d={poly(rrect(53, 45.5, 13, 7, 3))} className={ACCENT} />,
          line: (r) => (
            <path
              d={inked(rrect(53, 45.5, 13, 7, 3), true, r, 0.25)}
              className="m-ill__hair"
            />
          ),
          move: 'pulse',
          origin: [59.5, 49],
        },
      ];
    },
  },
  tags: {
    label: 'Journey tags',
    prop: 'tag',
    draw: () => {
      const tagA: P[] = [
        [20, 32],
        [29, 25],
        [38, 32],
        [38, 62],
        [20, 62],
      ];
      const tagB: P[] = [
        [46, 34],
        [55, 27],
        [64, 34],
        [64, 64],
        [46, 64],
      ];
      return [
        {
          fill: (
            <>
              {shadow(44, 30)}
              <path d={poly(tagA)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={ring(42, 14, 8, r, 0.4)} />
              <path
                d={inked(
                  [
                    [36, 20],
                    [29, 30],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__hair"
              />
              <path d={inked(tagA, true, r, 0.4)} />
              <path d={ring(29, 32, 1.8, r, 0.2)} />
              <path
                d={inked(
                  [
                    [24, 44],
                    [34, 44],
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
                    [24, 51],
                    [31, 51],
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
          fill: <path d={poly(tagB)} className={ACCENT} />,
          line: (r) => (
            <>
              <path
                d={inked(
                  [
                    [48, 20],
                    [55, 32],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__hair"
              />
              <path d={inked(tagB, true, r, 0.4)} />
              <path d={ring(55, 34, 1.8, r, 0.2)} />
            </>
          ),
          move: 'swing',
          origin: [55, 27],
        },
      ];
    },
  },
  largerScreen: {
    label: 'Made for a larger screen',
    prop: 'bulb',
    draw: () => {
      const screen = rrect(6, 8, 58, 40, 3);
      const content = rrect(14, 16, 26, 12, 2);
      const phone = rrect(72, 30, 16, 30, 3);
      return [
        {
          fill: (
            <>
              {shadow(46, 40)}
              <path d={poly(screen)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(screen, true, r, 0.5)} />
              <path
                d={inked(
                  [
                    [35, 48],
                    [35, 60],
                  ],
                  false,
                  r,
                  0.4,
                )}
              />
              <path
                d={inked(
                  [
                    [24, 62],
                    [46, 62],
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
                    [14, 36],
                    [54, 36],
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
                    [46, 20],
                    [56, 20],
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
          fill: <path d={poly(content)} className={ACCENT} />,
          line: (r) => <path d={inked(content, true, r, 0.35)} />,
          move: 'pulse',
          origin: [27, 22],
        },
        {
          fill: <path d={poly(phone)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(phone, true, r, 0.4)} />
              <path
                d={inked(
                  [
                    [77, 34],
                    [83, 34],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [76, 42],
                    [84, 42],
                  ],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__soft"
              />
            </>
          ),
          move: 'tilt',
          origin: [80, 60],
        },
      ];
    },
  },
  // the page stands closed with a padlock on it; on hover the lock jiggles
  noAccess: {
    label: 'No access',
    prop: 'key',
    draw: () => {
      const page = rrect(10, 8, 58, 56, 4);
      const body = rrect(54, 38, 26, 22, 3);
      const shackle: P[] = Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI + (i / 8) * Math.PI;
        return [67 + Math.cos(a) * 8, 38 + Math.sin(a) * 9] as P;
      });
      return [
        {
          fill: (
            <>
              {shadow(46, 40)}
              <path d={poly(page)} className={PAPER} />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(page, true, r, 0.55)} />
              <path
                d={inked(
                  [
                    [18, 20],
                    [50, 20],
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
                    [18, 28],
                    [42, 28],
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
                    [18, 36],
                    [46, 36],
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
          fill: <path d={poly(body)} className={ACCENT} />,
          line: (r) => (
            <>
              <path
                d={inked(
                  [[59, 38], ...shackle.slice(1, -1), [75, 38]],
                  false,
                  r,
                  0.3,
                )}
                className="m-ill__thick"
              />
              <path d={inked(body, true, r, 0.35)} />
              <path d={ring(67, 46, 2.4, r, 0.15)} className="m-ill__hair" />
              <path
                d={inked(
                  [
                    [67, 48.5],
                    [67, 53],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__hair"
              />
            </>
          ),
          move: 'tilt',
          origin: [67, 30],
        },
      ];
    },
  },
} satisfies Record<string, SubjectDef>;

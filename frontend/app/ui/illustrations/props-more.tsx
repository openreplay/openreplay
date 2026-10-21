import { ACCENT, type P, PAPER, disc, inked, poly, ring, rrect } from './ink';
import type { PropDef } from './props';

function starPts(cx: number, cy: number, ro: number, ri: number): P[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? ro : ri;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as P;
  });
}

export const MORE_PROPS = {
  clipboard: {
    label: 'Clipboard',
    use: 'A report, an audit',
    slot: 'side',
    move: 'tilt',
    draw: () => {
      const board = rrect(-8, -9, 16, 20, 2);
      const clip = rrect(-4, -11.5, 8, 4, 1.2);
      return [
        {
          fill: <path d={poly(board)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(board, true, r, 0.4)} />
              <path
                d={inked(
                  [
                    [-4.5, -2],
                    [4.5, -2],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__soft m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [-4.5, 2],
                    [4.5, 2],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__soft m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [-4.5, 6],
                    [1.5, 6],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__soft m-ill__hair"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(clip)} className={ACCENT} />,
          line: (r) => <path d={inked(clip, true, r, 0.25)} />,
        },
      ];
    },
  },
  wrench: {
    label: 'Wrench',
    use: 'Setting up, fixing',
    slot: 'head',
    move: 'tilt',
    draw: () => {
      const shaft: P[] = [
        [-2, -3],
        [2, -3],
        [2.5, 11],
        [-2.5, 11],
      ];
      const head: P[] = [
        [-2, -3],
        [-7, -6],
        [-7, -10],
        [-3.5, -11.5],
        [-2.5, -7.5],
        [2.5, -7.5],
        [3.5, -11.5],
        [7, -10],
        [7, -6],
        [2, -3],
      ];
      return [
        {
          fill: (
            <>
              <path d={poly(shaft)} className="m-ill__fill-side" />
              <path d={poly(head)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(head, true, r, 0.35)} />
              <path
                d={inked(
                  [
                    [-2, -3],
                    [-2.5, 11],
                    [2.5, 11],
                    [2, -3],
                  ],
                  false,
                  r,
                  0.35,
                )}
              />
              <path
                d={ring(0, 7.5, 1.2, r, 0.15)}
                className="m-ill__accent-fill"
              />
            </>
          ),
        },
      ];
    },
  },
  chart: {
    label: 'Chart sign',
    use: 'A number, a card',
    slot: 'antenna',
    draw: () => {
      const card = rrect(-11, -9, 22, 18, 2.5);
      const bars: [number, number][] = [
        [-6.5, 2],
        [-1.5, -2.5],
        [3.5, -5.5],
      ];
      return [
        {
          fill: <path d={poly(card)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(card, true, r, 0.45)} />
              <path
                d={inked(
                  [
                    [-8, 5.5],
                    [8, 5.5],
                  ],
                  false,
                  r,
                  0.25,
                )}
                className="m-ill__soft m-ill__hair"
              />
            </>
          ),
        },
        {
          fill: (
            <>
              {bars.slice(0, 2).map(([x, top]) => (
                <path
                  key={x}
                  d={poly(rrect(x, top, 3.2, 5.5 - top, 0.6))}
                  className="m-ill__fill-side"
                />
              ))}
              <path
                d={poly(
                  rrect(bars[2]![0], bars[2]![1], 3.2, 5.5 - bars[2]![1], 0.6),
                )}
                className={ACCENT}
              />
            </>
          ),
          line: (r) => (
            <>
              {bars.map(([x, top]) => (
                <path
                  key={x}
                  d={inked(rrect(x, top, 3.2, 5.5 - top, 0.6), true, r, 0.2)}
                />
              ))}
            </>
          ),
          move: 'pulse',
          origin: [0, 5.5],
        },
      ];
    },
  },
  envelope: {
    label: 'Envelope',
    use: 'An invite, a message sent',
    slot: 'head',
    move: 'bob',
    draw: () => {
      const body = rrect(-10, -3, 20, 14, 1.5);
      const flap: P[] = [
        [-10, -1.5],
        [0, 5],
        [10, -1.5],
      ];
      return [
        {
          fill: <path d={poly(body)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(body, true, r, 0.4)} />
              <path d={inked(flap, false, r, 0.35)} />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(0, 4.5, 2))} className={ACCENT} />,
          line: (r) => <path d={ring(0, 4.5, 2, r, 0.15)} />,
        },
      ];
    },
  },
  stopwatch: {
    label: 'Stopwatch',
    use: 'Waiting, a run in progress',
    slot: 'antenna',
    draw: () => [
      {
        fill: <path d={poly(disc(0, 2, 8.5))} className={PAPER} />,
        line: (r) => (
          <>
            <path d={ring(0, 2, 8.5, r, 0.35)} />
            <path
              d={inked(
                [
                  [0, -6.5],
                  [0, -9.5],
                ],
                false,
                r,
                0.2,
              )}
            />
            <path
              d={inked(
                [
                  [-2.5, -10.5],
                  [2.5, -10.5],
                ],
                false,
                r,
                0.2,
              )}
              className="m-ill__thick"
            />
            <path
              d={inked(
                [
                  [6, -5],
                  [7.8, -6.8],
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
        line: (r) => (
          <>
            <path
              d={inked(
                [
                  [0, 2],
                  [0, -3.5],
                ],
                false,
                r,
                0.15,
              )}
              className="m-ill__accent"
            />
            <path d={ring(0, 2, 1.1, r, 0.1)} className="m-ill__accent-fill" />
          </>
        ),
        move: 'spin',
        origin: [0, 2],
      },
    ],
  },
  key: {
    label: 'Key',
    use: 'A metadata key, access',
    slot: 'antenna',
    draw: () => {
      const blade: P[] = [
        [0, -1],
        [0, 11],
        [3.5, 11],
        [3.5, 8],
        [1.8, 8],
        [1.8, 6],
        [3.5, 6],
        [3.5, 3.5],
        [0, 3.5],
      ];
      return [
        {
          fill: <path d={poly(disc(0, -5.5, 5.5))} className={ACCENT} />,
          line: (r) => (
            <>
              <path d={ring(0, -5.5, 5.5, r, 0.3)} />
              <path
                d={ring(0, -6.5, 1.6, r, 0.15)}
                className="m-ill__fill-paper"
              />
            </>
          ),
        },
        { line: (r) => <path d={inked(blade, false, r, 0.25)} /> },
      ];
    },
  },
  bulb: {
    label: 'Light bulb',
    use: 'An idea, a suggestion',
    slot: 'antenna',
    draw: () => {
      const base = rrect(-3.5, 4.5, 7, 5, 1);
      return [
        {
          fill: (
            <path
              d={poly(disc(0, -3, 7.5))}
              className="m-ill__fill-accent-soft"
            />
          ),
          line: (r) => (
            <>
              <path d={ring(0, -3, 7.5, r, 0.35)} />
              <path
                d={inked(
                  [
                    [-2, -2.5],
                    [0, 1],
                    [2, -2.5],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__hair"
              />
            </>
          ),
          move: 'blink',
          origin: [0, -3],
        },
        {
          fill: <path d={poly(base)} className="m-ill__fill-side" />,
          line: (r) => (
            <>
              <path d={inked(base, true, r, 0.25)} />
              <path
                d={inked(
                  [
                    [-3.5, 7],
                    [3.5, 7],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__hair"
              />
            </>
          ),
        },
      ];
    },
  },
  pin: {
    label: 'Map pin',
    use: 'A place, a step on a journey',
    slot: 'head',
    move: 'bob',
    draw: () => {
      const drop: P[] = [
        [0, 11],
        [-5, 2],
        [-7.5, -3],
        [-6.5, -8],
        [-3, -11],
        [3, -11],
        [6.5, -8],
        [7.5, -3],
        [5, 2],
      ];
      return [
        {
          fill: <path d={poly(drop)} className={ACCENT} />,
          line: (r) => (
            <>
              <path d={inked(drop, true, r, 0.35)} />
              <path
                d={ring(0, -4, 2.6, r, 0.2)}
                className="m-ill__fill-paper"
              />
            </>
          ),
        },
      ];
    },
  },
  camera: {
    label: 'Camera',
    use: 'Recording, a Spot',
    slot: 'head',
    move: 'tilt',
    draw: () => {
      const body = rrect(-10, -5, 20, 16, 2);
      const hump: P[] = [
        [-4, -5],
        [-2.5, -8.5],
        [2.5, -8.5],
        [4, -5],
      ];
      return [
        {
          fill: (
            <>
              <path d={poly(hump)} className="m-ill__fill-side" />
              <path d={poly(body)} className={PAPER} />
              <path d={poly(disc(0, 3, 4.5))} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(hump, false, r, 0.25)} />
              <path d={inked(body, true, r, 0.4)} />
              <path d={ring(0, 3, 4.5, r, 0.25)} />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(7, -2, 1.5))} className={ACCENT} />,
          line: (r) => <path d={ring(7, -2, 1.5, r, 0.1)} />,
          move: 'pulse',
          origin: [7, -2],
        },
      ];
    },
  },
  puzzle: {
    label: 'Puzzle piece',
    use: 'An extension, a plugin',
    slot: 'head',
    move: 'bob',
    draw: () => {
      const piece: P[] = [
        [-9, -5],
        [-3, -5],
        [-3.5, -7.5],
        [-2, -10],
        [2, -10],
        [3.5, -7.5],
        [3, -5],
        [9, -5],
        [9, 1],
        [11, 0.5],
        [12, 2.5],
        [11, 5],
        [9, 4.5],
        [9, 11],
        [-9, 11],
        [-9, 4.5],
        [-7, 5],
        [-6, 2.5],
        [-7, 0.5],
        [-9, 1],
      ];
      return [
        {
          fill: <path d={poly(piece)} className={ACCENT} />,
          line: (r) => <path d={inked(piece, true, r, 0.3)} />,
        },
      ];
    },
  },
  box: {
    label: 'Box',
    use: 'An export, a delivery',
    slot: 'head',
    move: 'bob',
    draw: () => {
      const front: P[] = [
        [-9, -2],
        [5, -2],
        [5, 11],
        [-9, 11],
      ];
      const top: P[] = [
        [-9, -2],
        [-5, -6],
        [9, -6],
        [5, -2],
      ];
      const side: P[] = [
        [5, -2],
        [9, -6],
        [9, 7],
        [5, 11],
      ];
      return [
        {
          fill: (
            <>
              <path d={poly(top)} className="m-ill__fill-top" />
              <path d={poly(front)} className={PAPER} />
              <path d={poly(side)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path
                d={inked(
                  [
                    [-9, -2],
                    [-5, -6],
                    [9, -6],
                    [9, 7],
                    [5, 11],
                    [-9, 11],
                  ],
                  true,
                  r,
                  0.35,
                )}
              />
              <path
                d={inked(
                  [
                    [-9, -2],
                    [5, -2],
                    [9, -6],
                  ],
                  false,
                  r,
                  0.3,
                )}
              />
              <path
                d={inked(
                  [
                    [5, -2],
                    [5, 11],
                  ],
                  false,
                  r,
                  0.3,
                )}
              />
              <path
                d={inked(
                  [
                    [-2, -2],
                    [2, -6],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__accent"
              />
            </>
          ),
        },
      ];
    },
  },
  tag: {
    label: 'Tag',
    use: 'A property, a label',
    slot: 'antenna',
    draw: () => {
      const t: P[] = [
        [-6, -8],
        [6, -8],
        [6, 6],
        [0, 11],
        [-6, 6],
      ];
      return [
        {
          fill: <path d={poly(t)} className={PAPER} />,
          line: (r) => (
            <>
              <path d={inked(t, true, r, 0.35)} />
              <path
                d={inked(
                  [
                    [-3, 0],
                    [3, 0],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__soft m-ill__hair"
              />
              <path
                d={inked(
                  [
                    [-3, 3.5],
                    [1.5, 3.5],
                  ],
                  false,
                  r,
                  0.2,
                )}
                className="m-ill__soft m-ill__hair"
              />
            </>
          ),
        },
        {
          fill: <path d={poly(disc(0, -4.5, 1.6))} className={ACCENT} />,
          line: (r) => <path d={ring(0, -4.5, 1.6, r, 0.1)} />,
        },
      ];
    },
  },
  cursor: {
    label: 'Cursor',
    use: 'A click, a feature',
    slot: 'side',
    move: 'bob',
    draw: () => {
      const arrow: P[] = [
        [-6, -11],
        [-6, 7],
        [-1.5, 3],
        [1.5, 10],
        [4.5, 8.5],
        [1.5, 1.5],
        [7, 1],
      ];
      return [
        {
          fill: <path d={poly(arrow)} className={PAPER} />,
          line: (r) => <path d={inked(arrow, true, r, 0.3)} />,
        },
        {
          line: (r) => (
            <>
              <path
                d={inked(
                  [
                    [-9.5, -11],
                    [-11.5, -12.5],
                  ],
                  false,
                  r,
                  0.15,
                )}
                className="m-ill__accent"
              />
              <path
                d={inked(
                  [
                    [-10, -7],
                    [-12.5, -7],
                  ],
                  false,
                  r,
                  0.15,
                )}
                className="m-ill__accent"
              />
              <path
                d={inked(
                  [
                    [-6, -14],
                    [-6, -12.5],
                  ],
                  false,
                  r,
                  0.1,
                )}
                className="m-ill__accent"
              />
            </>
          ),
          move: 'blink',
          origin: [-6, -11],
        },
      ];
    },
  },
  plug: {
    label: 'Plug',
    use: 'A webhook, a connection',
    slot: 'side',
    move: 'tilt',
    draw: () => {
      const head = rrect(-6, -6, 12, 10, 2);
      return [
        {
          fill: <path d={poly(head)} className={PAPER} />,
          line: (r) => (
            <>
              <path
                d={inked(
                  [
                    [-3, -6],
                    [-3, -11],
                  ],
                  false,
                  r,
                  0.15,
                )}
                className="m-ill__thick"
              />
              <path
                d={inked(
                  [
                    [3, -6],
                    [3, -11],
                  ],
                  false,
                  r,
                  0.15,
                )}
                className="m-ill__thick"
              />
              <path d={inked(head, true, r, 0.3)} />
              <path
                d={inked(
                  [
                    [0, 4],
                    [0, 7],
                    [-4, 9.5],
                    [-8, 11],
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
          fill: <path d={poly(disc(0, -1, 1.5))} className={ACCENT} />,
          line: (r) => <path d={ring(0, -1, 1.5, r, 0.1)} />,
          move: 'blink',
          origin: [0, -1],
        },
      ];
    },
  },
  calendar: {
    label: 'Calendar',
    use: 'A date window',
    slot: 'side',
    move: 'tilt',
    draw: () => {
      const page = rrect(-9, -7, 18, 18, 2);
      const head: P[] = [
        [-9, -5],
        [-7, -7],
        [7, -7],
        [9, -5],
        [9, -2],
        [-9, -2],
      ];
      return [
        {
          fill: (
            <>
              <path d={poly(page)} className={PAPER} />
              <path d={poly(head)} className="m-ill__fill-side" />
            </>
          ),
          line: (r) => (
            <>
              <path d={inked(page, true, r, 0.35)} />
              <path
                d={inked(
                  [
                    [-9, -2],
                    [9, -2],
                  ],
                  false,
                  r,
                  0.25,
                )}
              />
              <path
                d={inked(
                  [
                    [-4, -9.5],
                    [-4, -5],
                  ],
                  false,
                  r,
                  0.15,
                )}
              />
              <path
                d={inked(
                  [
                    [4, -9.5],
                    [4, -5],
                  ],
                  false,
                  r,
                  0.15,
                )}
              />
              {[-5, 0, 5].map((x) => (
                <path
                  key={x}
                  d={inked(
                    [
                      [x - 1, 3],
                      [x + 1, 3],
                    ],
                    false,
                    r,
                    0.1,
                  )}
                  className="m-ill__soft m-ill__hair"
                />
              ))}
            </>
          ),
        },
        {
          fill: (
            <path
              d={poly(rrect(-1.6, 5.4, 3.2, 3.2, 0.8))}
              className={ACCENT}
            />
          ),
          line: (r) => (
            <path d={inked(rrect(-1.6, 5.4, 3.2, 3.2, 0.8), true, r, 0.1)} />
          ),
        },
      ];
    },
  },
  star: {
    label: 'Star',
    use: 'Something that matters to you',
    slot: 'antenna',
    draw: () => {
      const s = starPts(0, 0.5, 10.5, 4.6);
      return [
        {
          fill: <path d={poly(s)} className={ACCENT} />,
          line: (r) => <path d={inked(s, true, r, 0.3)} />,
          move: 'pulse',
          origin: [0, 0.5],
        },
      ];
    },
  },
} satisfies Record<string, PropDef>;

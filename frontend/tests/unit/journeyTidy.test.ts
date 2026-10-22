import { describe, expect, it } from '@jest/globals';

import { foldIds, tidyJourney } from '../../app/components/Charts/journeyTidy';

const page = (
  id: number,
  name: string,
  depth: number,
  startingNode = false,
) => ({
  id,
  name,
  eventType: 'LOCATION',
  depth,
  startingNode,
});
const link = (source: number, target: number, sessionsCount: number) => ({
  source,
  target,
  sessionsCount,
  value: sessionsCount,
});

describe('tidyJourney', () => {
  it('folds id segments', () => {
    expect(foldIds('/3679/session/4064123456789012345')).toBe(
      '/3679/session/:id',
    );
    expect(foldIds('/a/0123456789abcdef0123/b')).toBe('/a/:id/b');
    expect(foldIds('/u/123e4567-e89b-12d3-a456-426614174000')).toBe('/u/:id');
    expect(foldIds('/3679/sessions')).toBe('/3679/sessions');
  });

  it('makes pages that fold alike one step, links summed', () => {
    const t = tidyJourney(
      {
        nodes: [
          page(1, '/3679/sessions', 0, true),
          page(2, '/3679/session/4064123456789012345', 1),
          page(3, '/3679/session/4064999999999999999', 1),
          page(4, '/3679/settings', 1),
        ],
        links: [link(1, 2, 3), link(1, 3, 2), link(1, 4, 1)],
      },
      10,
    );
    const folded = t.nodes.find((n) => n.name === '/3679/session/:id')!;
    expect(folded.variants).toBe(2);
    expect(folded.match).toEqual({
      operator: 'startsWith',
      value: '/3679/session/',
    });
    expect(t.links.find((l) => l.target === folded.id)!.sessionsCount).toBe(5);
    expect(t.head).toBe('/3679');
  });

  it('folds a short number only when it is all that differs', () => {
    const t = tidyJourney(
      {
        nodes: [
          page(1, '/', 0, true),
          page(2, '/9156/sessions', 1),
          page(3, '/15452/sessions', 1),
          page(4, '/9156/settings', 1),
        ],
        links: [link(1, 2, 1), link(1, 3, 1), link(1, 4, 1)],
      },
      10,
    );
    expect(t.nodes.map((n) => n.name).sort()).toEqual(
      ['/', '/9156/settings', '/:id/sessions'].sort(),
    );
  });

  it('caps a column, the rest join its Other paths', () => {
    const nodes = [page(1, '/', 0, true)];
    const links = [];
    for (let i = 0; i < 8; i++) {
      nodes.push(page(10 + i, `/p${i}`, 1));
      links.push(link(1, 10 + i, 10 - i));
    }
    const t = tidyJourney({ nodes, links }, 5);
    const column = t.nodes.filter((n) => n.depth === 1);
    const other = column.find((n) => n.eventType === 'OTHER')!;
    expect(column.length).toBe(6);
    expect(other.variants).toBe(3);
    expect(t.links.find((l) => l.target === other.id)!.sessionsCount).toBe(
      5 + 4 + 3,
    );
  });
});

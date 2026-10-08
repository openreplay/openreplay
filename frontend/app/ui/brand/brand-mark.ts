export interface MarkRect {
  x: number;
  y: number;
  size: number;
  rx: number;
}

export const MARK_VIEWBOX = '0 0 16 16';

export const MARK_REST: { a: MarkRect; b: MarkRect } = {
  a: { x: 1.1, y: 3.5, size: 11.4, rx: 5.7 },
  b: { x: 11.9, y: 1, size: 3.4, rx: 0.9 },
};

export const MARK_TURNED: { a: MarkRect; b: MarkRect } = {
  a: { x: 0.7, y: 11.6, size: 3.4, rx: 0.9 },
  b: { x: 3.5, y: 1.1, size: 11.4, rx: 5.7 },
};

export const MARK_ANIMATED_PROPS = ['x', 'y', 'width', 'height', 'rx'] as const;

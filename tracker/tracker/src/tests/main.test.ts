// @ts-nocheck
import { describe, expect, test, jest, beforeAll, afterAll } from '@jest/globals'
import Tracker, { Options } from '../main/index.js'
const conditions: string[] = [
  'Map',
  'Set',
  'MutationObserver',
  'performance',
  'timing',
  'startsWith',
  'Blob',
  'Worker',
]

jest.mock('@medv/finder', () => ({ default: jest.fn(() => 'mocked network-proxy content') }));
jest.mock('@openreplay/network-proxy', () => ({ default: jest.fn(() => 'mocked network-proxy content') }));
// jest.mock('../main/modules/network', () => jest.fn(() => 'mocked network content'));

describe('Constructor Tests', () => {
  const options = {
    projectKey: 'test-project-key',
    ingestPoint: 'test-ingest-point',
    respectDoNotTrack: false,
    network: {},
    mouse: {},
    __DISABLE_SECURE_MODE: true
  };
  beforeAll(() => {
    // Mock the performance object and its timing property
    Object.defineProperty(window, 'performance', {
      value: {
        timing: {},
        now: jest.fn(() => 1000), // Mock performance.now() if needed
      },
    });
    Object.defineProperty(window, 'Worker', {
      value: jest.fn(() => 'mocked worker content')
    })
    global.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
  });

  afterAll(() => {
    // Clean up the mock after tests if needed
    delete window.performance;
    delete window.Worker;
    delete global.IntersectionObserver;
  });

  test('Takes options correctly', () => {
    const tracker = new Tracker(options as unknown as Options);
    expect(tracker.app.projectKey).toBe('test-project-key');
    expect(tracker.app.options.projectKey).toBe('test-project-key');
    expect(tracker.app.options.ingestPoint).toBe('test-ingest-point');
  })
})
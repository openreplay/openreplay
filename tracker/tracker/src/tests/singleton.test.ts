import { describe, expect, test, jest, beforeAll, afterAll } from '@jest/globals'
import singleton from "../main/singleton";

jest.mock('@medv/finder', () => ({ default: jest.fn(() => 'mocked network-proxy content') }));
jest.mock('@openreplay/network-proxy', () => ({ default: jest.fn(() => 'mocked network-proxy content') }));

const methods = [
  'onFlagsLoad',
  'isFlagEnabled',
  'clearPersistFlags',
  'reloadFlags',
  'getFeatureFlag',
  'getAllFeatureFlags',
  'restartCanvasTracking',
  'use',
  'isActive',
  'trackWs',
  'start',
  'coldStart',
  'startOfflineRecording',
  'uploadOfflineRecording',
  'stop',
  'forceFlushBatch',
  'getSessionToken',
  'getSessionInfo',
  'getSessionID',
  'getTabId',
  'getUxId',
  'getSessionURL',
  'setUserID',
  'setUserAnonymousID',
  'setMetadata',
  'event',
  'issue',
  'handleError',
]

describe('Singleton Testing', () => {
  const options = {
    projectKey: 'test-project-key',
    ingestPoint: 'test-ingest-point',
    respectDoNotTrack: false,
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
      disconnect: jest.fn(),
      root: null,
      rootMargin: '0px',
      thresholds: [0],
      takeRecords: jest.fn(() => []),
    }));
  });

  afterAll(() => {
    // Clean up the mock after tests if needed
    delete window.performance;
    delete window.Worker;
    delete global.IntersectionObserver;
  });

  test('Singleton methods are compatible with Class', () => {
    singleton.configure(options);

    methods.forEach(method => {
      console.log(method);
      expect(singleton[method]).toBeDefined();
    });
  })
})
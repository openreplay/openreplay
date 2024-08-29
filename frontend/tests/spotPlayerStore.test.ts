import { jest, beforeEach, describe, expect, it } from '@jest/globals';

import spotPlayerStore, {
  PANELS,
} from '../app/components/Spots/SpotPlayer/spotPlayerStore';

jest.mock('App/player', () => ({
  getResourceFromNetworkRequest: jest.fn(),
  Log: jest.fn((log: Record<string, any>) => ({
    isRed: log.level === 'exception' || log.level === 'error',
    isYellow: log.level === 'warn',
    ...log,
  })),
}));

jest.mock('App/player-ui', () => ({
  PlayingState: {
    Playing: 0,
    Paused: 1,
    Completed: 2,
  },
}));

enum PlayingState {
  Playing,
  Paused,
  Completed,
}

const createSampleEvents = () => {
  return {
    logs: [{ time: 1000, level: 'info', msg: 'Test log message' }],
    locations: [{ time: 2000, location: 'Test location', navTiming: {} }],
    clicks: [{ time: 3000, label: 'Test click' }],
    network: [
      {
        time: 4000,
        type: 'fetch',
        statusCode: 200,
        url: 'https://example.com',
        fromCache: false,
        body: 'Response body',
        encodedBodySize: 100,
        responseBodySize: 100,
        duration: 50,
        method: 'GET',
      },
    ],
  };
};

describe('SpotPlayerStore', () => {
  beforeEach(() => {
    spotPlayerStore.clearData();
  });

  it('should initialize with default values', () => {
    expect(spotPlayerStore.time).toBe(0);
    expect(spotPlayerStore.isPlaying).toBe(true);
    expect(spotPlayerStore.state).toBe(PlayingState.Playing);
    expect(spotPlayerStore.volume).toBe(1);
    expect(spotPlayerStore.logs).toEqual([]);
    expect(spotPlayerStore.network).toEqual([]);
  });

  it('should clear all data on clearData()', () => {
    spotPlayerStore.setDeviceData('Chrome', '1920x1080', 'Windows');
    spotPlayerStore.setIsPlaying(false);

    spotPlayerStore.clearData();

    expect(spotPlayerStore.time).toBe(0);
    expect(spotPlayerStore.isPlaying).toBe(true);
    expect(spotPlayerStore.state).toBe(PlayingState.Playing);
    expect(spotPlayerStore.browserVersion).toBeNull();
  });

  it('should set device data correctly', () => {
    spotPlayerStore.setDeviceData('Firefox', '1366x768', 'Linux');

    expect(spotPlayerStore.browserVersion).toBe('Firefox');
    expect(spotPlayerStore.resolution).toBe('1366x768');
    expect(spotPlayerStore.platform).toBe('Linux');
  });

  it('should set skip interval correctly', () => {
    spotPlayerStore.setSkipInterval(15);
    expect(spotPlayerStore.skipInterval).toBe(15);
  });

  it('should set active panel correctly', () => {
    spotPlayerStore.setActivePanel(PANELS.CONSOLE);
    expect(spotPlayerStore.activePanel).toBe(PANELS.CONSOLE);

    spotPlayerStore.setActivePanel(null);
    expect(spotPlayerStore.activePanel).toBeNull();
  });

  it('should set duration correctly', () => {
    spotPlayerStore.setDuration('02:30');
    expect(spotPlayerStore.duration).toBe(150);
    expect(spotPlayerStore.durationString).toBe('02:30');
  });

  it('should update logs, locations, clicks, and network events correctly', () => {
    const { logs, locations, clicks, network } = createSampleEvents();

    // @ts-ignore
    spotPlayerStore.setEvents(logs, locations, clicks, network);

    expect(spotPlayerStore.logs.length).toBe(1);
    expect(spotPlayerStore.locations.length).toBe(1);
    expect(spotPlayerStore.clicks.length).toBe(1);
    expect(spotPlayerStore.network.length).toBe(1);
  });

  it('should correctly compute the current log index', () => {
    spotPlayerStore.logs = [{ time: 1000 }, { time: 2000 }, { time: 3000 }];
    spotPlayerStore.time = 1.5;

    const currentIndex = spotPlayerStore.currentLogIndex;

    expect(currentIndex).toBe(0);
  });

  it('should correctly highlight the closest event', () => {
    const eventTime = 2;
    // @ts-ignore
    spotPlayerStore.locations = [{ time: 1000 }, { time: 3000 }];

    const closestLocation = spotPlayerStore.getClosestLocation(eventTime);

    expect(closestLocation.time).toBe(1000);
  });

  it('should correctly set the playing state', () => {
    spotPlayerStore.setIsPlaying(false);
    expect(spotPlayerStore.isPlaying).toBe(false);
    expect(spotPlayerStore.state).toBe(PlayingState.Paused);

    spotPlayerStore.setIsPlaying(true);
    expect(spotPlayerStore.isPlaying).toBe(true);
    expect(spotPlayerStore.state).toBe(PlayingState.Playing);
  });

  it('should correctly mute and unmute', () => {
    spotPlayerStore.setIsMuted(true);
    expect(spotPlayerStore.isMuted).toBe(true);

    spotPlayerStore.setIsMuted(false);
    expect(spotPlayerStore.isMuted).toBe(false);
  });

  it('should correctly set volume', () => {
    spotPlayerStore.setVolume(0.5);
    expect(spotPlayerStore.volume).toBe(0.5);

    spotPlayerStore.setVolume(1);
    expect(spotPlayerStore.volume).toBe(1);
  });

  it('should correctly handle fullscreen toggle', () => {
    spotPlayerStore.setIsFullScreen(true);
    expect(spotPlayerStore.isFullScreen).toBe(true);

    spotPlayerStore.setIsFullScreen(false);
    expect(spotPlayerStore.isFullScreen).toBe(false);
  });
});

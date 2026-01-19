import { sessionService } from '../../app/services';
import Session from '../../app/types/session';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import SessionStore from '../../app/mstore/sessionStore';
import { searchStore } from '../../app/mstore/index';
import { checkEventWithFilters } from '../../app/components/Session_/Player/Controls/checkEventWithFilters';
import { mockSession } from '../mocks/sessionData';

jest.mock('../../app/player', () => ({
  createWebPlayer: jest.fn(),
  createIOSPlayer: jest.fn(),
  createClickMapPlayer: jest.fn(),
  createLiveWebPlayer: jest.fn(),
  createClipPlayer: jest.fn(),
}));

jest.mock('../../app/services', () => ({
  sessionService: {
    getSessions: jest.fn(),
    getLiveSessions: jest.fn(),
    getSessionInfo: jest.fn(),
    getSessionEvents: jest.fn(),
    getSessionNotes: jest.fn(),
    getFavoriteSessions: jest.fn(),
    getSessionClickMap: jest.fn(),
    toggleFavorite: jest.fn(),
    getClickMap: jest.fn(),
    getAutoplayList: jest.fn(),
    getFirstMobUrl: jest.fn(),
  },
}));

jest.mock('App/player/web/network/loadFiles', () => ({
  loadFile: jest.fn(),
}));

jest.mock(
  '@/components/Session_/Player/Controls/checkEventWithFilters',
  () => ({
    checkEventWithFilters: jest.fn(),
  }),
);

jest.mock('../../app/mstore/index', () => ({
  searchStore: {
    instance: {
      filters: [],
      events: [],
      toSearch: jest.fn().mockReturnValue({}),
    },
  },
  searchStoreLive: {
    instance: {
      filters: [],
      events: [],
    },
  },
}));

describe('SessionStore', () => {
  let sessionStore: SessionStore;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStore = new SessionStore();
  });

  describe('resetUserFilter', () => {
    it('should reset user filter', () => {
      sessionStore.userFilter.update('page', 5);
      expect(sessionStore.userFilter.page).toBe(5);

      sessionStore.resetUserFilter();
      expect(sessionStore.userFilter.page).toBe(1);
    });
  });

  describe('fetchLiveSessions', () => {
    it('should fetch and set live sessions', async () => {
      const mockResponse = {
        sessions: [{ sessionId: 'live-1', userId: 'user1' }],
        total: 1,
      };

      (sessionService.getLiveSessions as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      await sessionStore.fetchLiveSessions({ sort: 'timestamp' });

      expect(sessionService.getLiveSessions).toHaveBeenCalledWith({
        sort: 'timestamp',
      });
      expect(sessionStore.liveSessions.length).toBe(1);
      expect(sessionStore.liveSessions[0].sessionId).toBe('live-1');
      expect(sessionStore.liveSessions[0].live).toBe(true);
      expect(sessionStore.totalLiveSessions).toBe(1);
      expect(sessionStore.loadingLiveSessions).toBe(false);
    });

    it('should handle duration sort by converting to timestamp', async () => {
      (sessionService.getLiveSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        total: 0,
      });

      await sessionStore.fetchLiveSessions({ sort: 'duration', order: 'asc' });

      expect(sessionService.getLiveSessions).toHaveBeenCalledWith({
        sort: 'timestamp',
        order: 'desc',
      });
    });

    it('should handle errors and set loading to false', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();

      (sessionService.getLiveSessions as jest.Mock).mockRejectedValue(
        mockError,
      );

      await sessionStore.fetchLiveSessions();

      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(sessionStore.loadingLiveSessions).toBe(false);
    });
  });

  describe('fetchSessions', () => {
    it('should fetch and set sessions', async () => {
      const mockResponse = {
        sessions: [
          new Session(mockSession({ sessionId: '1', favorite: true })),
          new Session(mockSession({ sessionId: '2' })),
        ],
        total: 2,
      };

      (sessionService.getSessions as jest.Mock).mockResolvedValue(mockResponse);

      await sessionStore.fetchSessions({ page: 1, filters: [] }, true);

      expect(sessionService.getSessions).toHaveBeenCalledWith({
        page: 1,
        filters: [],
      });
      expect(sessionStore.list.length).toBe(2);
      expect(sessionStore.total).toBe(2);
      expect(sessionStore.sessionIds).toEqual(['1', '2']);
      expect(sessionStore.favoriteList.length).toBe(1);
      expect(sessionStore.favoriteList[0].sessionId).toBe('1');
      expect(sessionStore.loadingSessions).toBe(false);
    });

    it('should handle errors and set loading to false', async () => {
      const mockError = new Error('API error');
      console.error = jest.fn();

      (sessionService.getSessions as jest.Mock).mockRejectedValue(mockError);

      await sessionStore.fetchSessions({ filters: [] }, true);

      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(sessionStore.loadingSessions).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear session list and current session', () => {
      sessionStore.list = [new Session({ sessionId: 'test' })];
      sessionStore.current = new Session({ sessionId: 'current' });

      sessionStore.clearAll();

      expect(sessionStore.list).toEqual([]);
      expect(sessionStore.current.sessionId).toBe('');
    });
  });

  describe('fetchSessionData', () => {
    it('should fetch and set session data with events', async () => {
      const mockSessionId = 'test-session-id';
      const mockSessionInfo = { sessionId: mockSessionId, userId: 'user1' };
      const mockEventsData = {
        events: [
          { type: 'LOCATION', url: 'https://example.com', time: 100 },
          { type: 'CLICK', value: 'button', time: 200 },
        ],
        errors: [],
        crashes: [],
        issues: [],
        resources: [],
        stackEvents: [],
        userEvents: [],
        userTesting: [],
      };

      (sessionService.getSessionInfo as jest.Mock).mockResolvedValue(
        mockSessionInfo,
      );
      (sessionService.getSessionEvents as jest.Mock).mockResolvedValue(
        mockEventsData,
      );
      (checkEventWithFilters as jest.Mock).mockReturnValue(false);

      await sessionStore.fetchSessionData(mockSessionId);

      expect(sessionService.getSessionInfo).toHaveBeenCalledWith(
        mockSessionId,
        false,
      );
      expect(sessionService.getSessionEvents).toHaveBeenCalledWith(
        mockSessionId,
      );
      expect(sessionStore.current.sessionId).toBe(mockSessionId);
      expect(sessionStore.visitedEvents.length).toBe(1);
      expect(sessionStore.visitedEvents[0].url).toBe('https://example.com');
      expect(sessionStore.host).toBe('');
      expect(sessionStore.prefetched).toBe(false);
    });

    it('should handle event filtering based on search filters', async () => {
      const mockSessionId = 'test-session-id';
      const mockSessionInfo = { sessionId: mockSessionId, userId: 'user1' };
      const mockEventsData = {
        events: [
          { type: 'LOCATION', url: 'https://example.com', time: 100 },
          { type: 'CLICK', value: 'button', time: 200 },
        ],
      };

      // Setup search filters
      (searchStore.instance.events as any) = [
        { key: 'LOCATION', operator: 'is', value: 'https://example.com' },
      ];

      (sessionService.getSessionInfo as jest.Mock).mockResolvedValue(
        mockSessionInfo,
      );
      (sessionService.getSessionEvents as jest.Mock).mockResolvedValue(
        mockEventsData,
      );
      (checkEventWithFilters as jest.Mock).mockReturnValue(true);

      await sessionStore.fetchSessionData(mockSessionId);

      expect(sessionStore.eventsIndex).toEqual([]);
    });

    it('should handle different filter operators', async () => {
      const mockSessionId = 'test-session-id';
      const mockSessionInfo = { sessionId: mockSessionId, userId: 'user1' };
      const mockEventsData = {
        events: [
          { type: 'LOCATION', url: 'https://example.com', time: 100 },
          { type: 'CLICK', value: 'test-button', time: 200 },
        ],
      };

      (searchStore.instance.events as any) = [
        { key: 'CLICK', operator: 'contains', value: 'test' },
      ];

      (sessionService.getSessionInfo as jest.Mock).mockResolvedValue(
        mockSessionInfo,
      );
      (sessionService.getSessionEvents as jest.Mock).mockResolvedValue(
        mockEventsData,
      );
      (checkEventWithFilters as jest.Mock).mockReturnValue(true);

      await sessionStore.fetchSessionData(mockSessionId);

      expect(sessionStore.eventsIndex).toEqual([]);
    });

    it('should handle errors when fetching events', async () => {
      const mockSessionId = 'test-session-id';
      const mockSessionInfo = { sessionId: mockSessionId, userId: 'user1' };
      const mockError = new Error('API error');
      console.error = jest.fn();

      (sessionService.getSessionInfo as jest.Mock).mockResolvedValue(
        mockSessionInfo,
      );
      (sessionService.getSessionEvents as jest.Mock).mockRejectedValue(
        mockError,
      );

      await sessionStore.fetchSessionData(mockSessionId);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch events',
        mockError,
      );
      expect(sessionStore.current.sessionId).toBe(mockSessionId);
      expect(sessionStore.current.events).toEqual([]);
    });

    it('should handle errors when fetching session info', async () => {
      const mockSessionId = 'test-session-id';
      const mockError = new Error('API error');
      console.error = jest.fn();

      (sessionService.getSessionInfo as jest.Mock).mockRejectedValue(mockError);

      await sessionStore.fetchSessionData(mockSessionId);

      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(sessionStore.fetchFailed).toBe(true);
    });
  });

  describe('sortSessions', () => {
    it('should sort sessions by the specified key in ascending order', () => {
      sessionStore.list = [
        new Session(mockSession({ duration: 3000, sessionId: '1' })),
        new Session(mockSession({ duration: 1000, sessionId: '2' })),
        new Session(mockSession({ duration: 2000, sessionId: '3' })),
      ];
      sessionStore.favoriteList = [
        new Session(mockSession({ duration: 3000, sessionId: '1' })),
        new Session(mockSession({ duration: 2000, sessionId: '3' })),
      ];

      sessionStore.sortSessions('duration', 1);

      expect(sessionStore.list.map((s) => s.sessionId)).toEqual([
        '2',
        '3',
        '1',
      ]);
      expect(sessionStore.favoriteList.map((s) => s.sessionId)).toEqual([
        '3',
        '1',
      ]);
    });

    it('should sort sessions by the specified key in descending order', () => {
      sessionStore.list = [
        new Session(mockSession({ duration: 3000, sessionId: '1' })),
        new Session(mockSession({ duration: 1000, sessionId: '2' })),
        new Session(mockSession({ duration: 2000, sessionId: '3' })),
      ];

      sessionStore.sortSessions('duration', -1);
      expect(sessionStore.list.map((s) => s.sessionId)).toEqual([
        '1',
        '3',
        '2',
      ]);
    });
  });
});

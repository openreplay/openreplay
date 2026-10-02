import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import SimpleStore from '../../../player/src/common/SimpleStore';
import Player, { SPEED_OPTIONS } from '../../../player/src/player/Player';

class DummyMM {
  move = jest.fn();
  onFileReadSuccess = jest.fn();
  onFileReadFailed = jest.fn();
  onFileReadFinally = jest.fn();
  startLoading = jest.fn();
  resetMessageManagers = jest.fn();
  getListsFullState = jest.fn();
  distributeMessage = jest.fn();
  setMessagesLoading = jest.fn();
  clean = jest.fn();
  sortDomRemoveMessages = jest.fn();
}

function createPlayer(overrides: Record<string, any> = {}) {
  const state = new SimpleStore({
    ...Player.INITIAL_STATE,
    ready: true,
    skipIntervals: [],
    lastMessageTime: 0,
    ...overrides,
  });
  const mm = new DummyMM();
  const player = new Player(state as any, mm as any);
  return { player, state, mm };
}

beforeEach(() => {
  localStorage.clear();
});

describe('Player speed controls', () => {
  it('toggleSpeed doubles speed when index null', () => {
    const { player, state } = createPlayer();
    player.toggleSpeed(null);
    expect(state.get().speed).toBe(2);
  });

  it('toggleSpeed sets speed by index within range', () => {
    const { player, state } = createPlayer();
    player.toggleSpeed(0);
    expect(state.get().speed).toBe(SPEED_OPTIONS[0]);
    player.toggleSpeed(10);
    expect(state.get().speed).toBe(SPEED_OPTIONS[SPEED_OPTIONS.length - 1]);
  });

  it('speedUp and speedDown limit speed bounds', () => {
    const { player, state } = createPlayer();
    player.speedUp();
    expect(state.get().speed).toBe(2);
    state.update({ speed: 16 });
    player.speedUp();
    expect(state.get().speed).toBe(16);
    player.speedDown();
    expect(state.get().speed).toBe(8);
    state.update({ speed: 1 });
    player.speedDown();
    expect(state.get().speed).toBe(1);
  });
});

describe('Player state toggles', () => {
  it('toggleAutoplay updates localStorage and state', () => {
    const { player, state } = createPlayer();
    player.toggleAutoplay();
    expect(localStorage.getItem('__$player-autoplay$__')).toBe('true');
    expect(state.get().autoplay).toBe(true);
  });

  it('toggleEvents updates localStorage and state', () => {
    const { player, state } = createPlayer();
    player.toggleEvents();
    expect(localStorage.getItem('__$player-show-events$__')).toBe('true');
    expect(state.get().showEvents).toBe(true);
  });

  it('toggleSkipToIssue updates localStorage and state', () => {
    const { player, state } = createPlayer();
    player.toggleSkipToIssue();
    expect(localStorage.getItem('__$session-skipToIssue$__')).toBe('true');
    expect(state.get().skipToIssue).toBe(true);
  });

  it('toggleSkip updates localStorage and state', () => {
    const { player, state } = createPlayer();
    player.toggleSkip();
    expect(localStorage.getItem('__$player-skip$__')).toBe('true');
    expect(state.get().skip).toBe(true);
  });

  it('toggleRange updates store range', () => {
    const { player, state } = createPlayer();
    player.toggleRange(1, 5);
    expect(state.get().range).toEqual([1, 5]);
  });

  it('clean pauses player and cleans manager', () => {
    const { player, mm } = createPlayer();
    const pauseSpy = jest.spyOn(player as any, 'pause').mockImplementation();
    player.clean();
    expect(pauseSpy).toHaveBeenCalled();
    expect(mm.clean).toHaveBeenCalled();
  });

  it('auto plays on init when autoplay true', () => {
    const { state } = createPlayer({ autoplay: true });
    expect(state.get().playing).toBe(true);
  });
});

describe('Player lifecycle', () => {
  it('pause during loading cancels the pending autoplay retry', () => {
    jest.useFakeTimers();
    const { player, state } = createPlayer({ ready: false });
    player.play();
    player.pause();
    state.update({ ready: true });
    jest.advanceTimersByTime(1000);
    expect(state.get().playing).toBe(false);
    jest.useRealTimers();
  });

  it('an explicit pause during a click hold cancels the resume', () => {
    jest.useFakeTimers();
    const { player, state } = createPlayer();
    state.update({ playing: true });
    player.pauseFor(750);
    player.pause();
    jest.advanceTimersByTime(1000);
    expect(state.get().playing).toBe(false);
    jest.useRealTimers();
  });

  it('clean stops retries and removes the autoplay listener', () => {
    jest.useFakeTimers();
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const { player, state, mm } = createPlayer({ ready: false, autoplay: true });
    player.clean();
    state.update({ ready: true });
    jest.advanceTimersByTime(1000);
    expect(state.get().playing).toBe(false);
    expect(mm.clean).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeSpy.mockRestore();
    jest.useRealTimers();
  });
});

describe('Player frame loop', () => {
  it('a click hold triggered from move() stops the running loop', () => {
    let frames: Array<(t: number) => void> = [];
    const raf = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: any) => {
        frames.push(cb);
        return frames.length;
      });
    const { player, state, mm } = createPlayer();
    let held = false;
    mm.move.mockImplementation((t: number) => {
      if (t > 0 && !held) {
        held = true;
        player.pauseFor(750);
      }
    });
    player.play();
    const run = (t: number) => {
      const pending = frames;
      frames = [];
      pending.forEach((cb) => cb(t));
    };
    run(0);
    run(16);
    expect(state.get().playing).toBe(false);
    const timeAtHold = state.get().time;
    run(32);
    run(48);
    expect(frames.length).toBe(0);
    expect(state.get().time).toBe(timeAtHold);
    raf.mockRestore();
  });
});

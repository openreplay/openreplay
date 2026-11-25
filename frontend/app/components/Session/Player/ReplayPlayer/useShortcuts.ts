import { useContext, useEffect } from 'react';

import { copyWithToast } from 'App/lib/use-copy';
import { blockValues, blocks } from 'App/mstore/uiPlayerStore';
import { SKIP_INTERVALS } from 'App/player-ui/clock';
import { ownsKeys } from 'App/utils/keys';
import { PlayerContext } from 'Components/Session/playerContext';

function useShortcuts({
  skipInterval,
  fullScreenToggle,
  fullScreenOff,
  toggleBottomBlock,
  openNextSession,
  openPrevSession,
  setActiveTab,
  disableDevtools,
}: {
  skipInterval: keyof typeof SKIP_INTERVALS;
  fullScreenToggle: () => void;
  fullScreenOff: () => void;
  toggleBottomBlock: (blockName: (typeof blockValues)[number]) => void;
  openNextSession: () => void;
  openPrevSession: () => void;
  setActiveTab: (tab: string) => void;
  disableDevtools?: boolean;
}) {
  const { player, store } = useContext(PlayerContext);

  const copySessionUrl = (withTs?: boolean) => {
    const url = withTs
      ? `${window.location.href}?jumpto=${store.get().time}`
      : window.location.href;
    void copyWithToast(url, 'Copied session url to clipboard');
  };
  const forthTenSeconds = () => {
    player.jumpInterval(SKIP_INTERVALS[skipInterval]);
  };

  const backTenSeconds = () => {
    player.jumpInterval(-SKIP_INTERVALS[skipInterval]);
  };

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (ownsKeys(e.target)) return false;
      // read before the Shift block below prevents it, so Shift+Space plays
      const prevented = e.defaultPrevented;
      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        player.toggleInspectorMode(false);
        switch (e.key) {
          case 'F':
            return fullScreenToggle();
          case 'X':
            return disableDevtools ? null : toggleBottomBlock(blocks.overview);
          case 'P':
            return disableDevtools
              ? null
              : toggleBottomBlock(blocks.performance);
          case 'N':
            return disableDevtools ? null : toggleBottomBlock(blocks.network);
          case 'C':
            return disableDevtools ? null : toggleBottomBlock(blocks.console);
          case 'R':
            return disableDevtools ? null : toggleBottomBlock(blocks.storage);
          case 'E':
            return disableDevtools
              ? null
              : toggleBottomBlock(blocks.stackEvents);
          case '>':
            return openNextSession();
          case '<':
            return openPrevSession();
          case 'U':
            return copySessionUrl(true);
          case 'A':
            player.pause();
            return setActiveTab('EVENTS');
          default:
            break;
        }
      }
      if (e.key === 'Esc' || e.key === 'Escape') {
        fullScreenOff();
      }
      if (e.key === ' ' && !prevented) {
        e.preventDefault();
        (document.activeElement as HTMLInputElement | null)?.blur?.();
        player.togglePlay();
      }
      if (e.key === 'ArrowRight') {
        forthTenSeconds();
      }
      if (e.key === 'ArrowLeft') {
        backTenSeconds();
      }
      if (e.key === 'ArrowDown') {
        player.speedDown();
      }
      if (e.key === 'ArrowUp') {
        player.speedUp();
      }
    };

    document.addEventListener('keydown', handleShortcuts);
    return () => {
      document.removeEventListener('keydown', handleShortcuts);
    };
  }, [
    forthTenSeconds,
    backTenSeconds,
    player,
    fullScreenToggle,
    fullScreenOff,
  ]);
}

export default useShortcuts;

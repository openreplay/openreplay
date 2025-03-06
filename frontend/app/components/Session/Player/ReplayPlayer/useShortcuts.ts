import copy from 'copy-to-clipboard';
import { useContext, useEffect } from 'react';
import { toast } from 'react-toastify';

import { PlayerContext } from 'Components/Session/playerContext';
import { SKIP_INTERVALS } from 'Components/Session_/Player/Controls/Controls';
import { blockValues, blocks } from 'App/mstore/uiPlayerStore';

function useShortcuts({
  skipInterval,
  fullScreenOn,
  fullScreenOff,
  toggleBottomBlock,
  openNextSession,
  openPrevSession,
  setActiveTab,
  disableDevtools,
}: {
  skipInterval: keyof typeof SKIP_INTERVALS;
  fullScreenOn: () => void;
  fullScreenOff: () => void;
  toggleBottomBlock: (blockName: (typeof blockValues)[number]) => void;
  openNextSession: () => void;
  openPrevSession: () => void;
  setActiveTab: (tab: string) => void;
  disableDevtools?: boolean;
}) {
  const { player, store } = useContext(PlayerContext);

  const copySessionUrl = (withTs?: boolean) => {
    if (withTs) {
      const { time } = store.get();
      const sessUrl = `${window.location.href}?jumpto=${time}`;
      copy(sessUrl);
    } else {
      copy(window.location.href);
    }
    toast.success('Copied session url to clipboard');
  };
  const forthTenSeconds = () => {
    player.jumpInterval(SKIP_INTERVALS[skipInterval]);
  };

  const backTenSeconds = () => {
    player.jumpInterval(-SKIP_INTERVALS[skipInterval]);
  };

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return false;
      }
      if (e.shiftKey) {
        e.preventDefault();
        player.toggleInspectorMode(false);
        switch (e.key) {
          case 'F':
            return fullScreenOn();
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
      if (e.key === ' ') {
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
  }, [forthTenSeconds, backTenSeconds, player, fullScreenOn, fullScreenOff]);
}

export default useShortcuts;

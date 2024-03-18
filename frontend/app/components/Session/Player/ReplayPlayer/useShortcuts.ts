import { SKIP_INTERVALS } from 'Components/Session_/Player/Controls/Controls';
import { useEffect, useContext } from 'react';
import { PlayerContext } from 'Components/Session/playerContext';
import { blockValues, blocks } from 'Duck/components/player';

function useShortcuts({
  skipInterval,
  fullScreenOn,
  fullScreenOff,
  toggleBottomBlock,
  openNextSession,
  openPrevSession,
  setActiveTab,
}: {
  skipInterval: keyof typeof SKIP_INTERVALS;
  fullScreenOn: () => void;
  fullScreenOff: () => void;
  toggleBottomBlock: (blockName: (typeof blockValues)[number]) => void;
  openNextSession: () => void;
  openPrevSession: () => void;
  setActiveTab: (tab: string) => void;
}) {
  const { player } = useContext(PlayerContext);

  const forthTenSeconds = () => {
    player.jumpInterval(SKIP_INTERVALS[skipInterval]);
  };

  const backTenSeconds = () => {
    player.jumpInterval(-SKIP_INTERVALS[skipInterval]);
  };

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
      // shift + f = fullscreenOn
      if (e.shiftKey) {
        player.toggleInspectorMode(false)
        switch (e.key) {
          case 'F':
            return fullScreenOn();
          case 'X':
            return toggleBottomBlock(blocks.overview);
          case 'P':
            return toggleBottomBlock(blocks.performance);
          case 'N':
            return toggleBottomBlock(blocks.network);
          case 'C':
            return toggleBottomBlock(blocks.console);
          case 'R':
            return toggleBottomBlock(blocks.storage);
          case 'E':
            return toggleBottomBlock(blocks.stackEvents);
          case '>':
            return openNextSession();
          case '<':
            return openPrevSession();
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

    document.addEventListener('keydown', handleShortcuts, true);
    return () => {
      document.removeEventListener('keydown', handleShortcuts, true);
    };
  }, [forthTenSeconds, backTenSeconds, player, fullScreenOn, fullScreenOff]);
}

export default useShortcuts;

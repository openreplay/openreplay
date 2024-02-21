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
}: {
  skipInterval: keyof typeof SKIP_INTERVALS;
  fullScreenOn: () => void;
  fullScreenOff: () => void;
  toggleBottomBlock: (blockName: (typeof blockValues)[number]) => void;
  openNextSession: () => void;
  openPrevSession: () => void;
}) {
  const { player } = useContext(PlayerContext);

  const forthTenSeconds = () => {
    player.jumpInterval(SKIP_INTERVALS[skipInterval]);
  };

  const backTenSeconds = () => {
    player.jumpInterval(-SKIP_INTERVALS[skipInterval]);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
      // shift + f = fullscreenOn
      if (e.shiftKey) {
        player.toggleInspectorMode(false)
        switch (e.key) {
          case 'f':
            return fullScreenOn();
          case 'x':
            return toggleBottomBlock(blocks.overview);
          case 'p':
            return toggleBottomBlock(blocks.performance);
          case 'n':
            return toggleBottomBlock(blocks.network);
          case 'c':
            return toggleBottomBlock(blocks.console);
          case 'r':
            return toggleBottomBlock(blocks.storage);
          case 'e':
            return toggleBottomBlock(blocks.stackEvents);
          case '>':
            return openNextSession();
          // return nextSessionId
          //   ? history.push(withSiteId(sessionRoute(nextSessionId), siteId))
          //   : null;
          case '<':
            return openPrevSession();
          // return previousSessionId
          //   ? history.push(withSiteId(sessionRoute(previousSessionId), siteId))
          //   : null;
          default:
            break;
        }
      }
      if (e.key === 'Esc' || e.key === 'Escape') {
        fullScreenOff();
      }
      if (e.key === ' ') {
        // @ts-ignore
        document.activeElement?.blur();
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

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [skipInterval]);
}

export default useShortcuts;

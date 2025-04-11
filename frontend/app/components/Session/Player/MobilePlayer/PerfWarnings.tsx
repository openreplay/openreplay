import { MobilePerformanceEvent } from 'Player/web/messages';
import React from 'react';
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';
import { mapIphoneModel } from 'Player/mobile/utils';
import cn from 'classnames';
import { NONE } from 'App/mstore/uiPlayerStore';
import { useStore } from 'App/mstore';

type warningsType =
  | 'thermalState'
  | 'memoryWarning'
  | 'lowDiskSpace'
  | 'isLowPowerModeEnabled'
  | 'batteryLevel'
  | 'background';

const elements = {
  thermalState: {
    title: 'Overheating',
    icon: 'thermometer-sun',
  },
  memoryWarning: {
    title: 'High Memory Usage',
    icon: 'memory-ios',
  },
  lowDiskSpace: {
    title: 'Low Disk Space',
    icon: 'low-disc-space',
  },
  isLowPowerModeEnabled: {
    title: 'Low Power Mode',
    icon: 'battery-charging',
  },
  batteryLevel: {
    title: 'Low Battery',
    icon: 'battery',
  },
  background: {
    title: 'In Background',
    icon: 'eye-slash',
  },
} as const;

function PerfWarnings({ userDevice }: { userDevice: string }) {
  const { store } = React.useContext(MobilePlayerContext);
  const { uiPlayerStore, sessionStore } = useStore();
  const { scale, performanceListNow, performanceList, inBackground } =
    store.get();
  const { bottomBlock } = uiPlayerStore;
  const allElements = Object.keys(elements) as warningsType[];
  const list = React.useMemo(
    () =>
      allElements.filter(
        (el) =>
          performanceList.findIndex(
            (pw: MobilePerformanceEvent & { techName: warningsType }) =>
              pw.techName === el,
          ) !== -1,
      ),
    [performanceList.length],
  );
  const width = sessionStore.current.screenWidth ?? 0;

  const leftMargin =
    width > 0
      ? (width / 2) * scale + 20
      : (mapIphoneModel(userDevice).styles.shell.width / 2 + 10) * scale;
  const contStyles = {
    left: '50%',
    display: 'flex',
    marginLeft: `${leftMargin}px`,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '6px',
    position: 'absolute',
    width: '200px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 0,
  } as const;

  const activeWarnings = React.useMemo(() => {
    const warnings: warningsType[] = [];
    performanceListNow.forEach(
      (warn: MobilePerformanceEvent & { techName: warningsType }) => {
        switch (warn.techName) {
          case 'thermalState':
            if (warn.value > 1) warnings.push(warn.techName); // 2 = serious 3 = overheating
            break;
          case 'memoryWarning':
            warnings.push(warn.techName);
            break;
          case 'lowDiskSpace':
            warnings.push(warn.techName);
            break;
          case 'isLowPowerModeEnabled':
            if (warn.value === 1) warnings.push(warn.techName);
            break;
          case 'batteryLevel':
            if (warn.value < 25) warnings.push(warn.techName);
            break;
        }
      },
    );
    return warnings;
  }, [performanceListNow.length]);
  if (bottomBlock !== NONE) return null;
  return (
    <div id="warnings-container" style={contStyles}>
      {inBackground ? (
        <div
          className={cn(
            'transition-all flex items-center gap-1 bg-white border rounded px-2 py-1',
            'opacity-100',
          )}
        >
          <Icon name={elements.background.icon} size={16} />
          <span>{elements.background.title}</span>
        </div>
      ) : null}
      {list.map((w) => (
        <div
          className={cn(
            'transition-all flex items-center gap-1 bg-white border rounded px-2 py-1',
            activeWarnings.findIndex((a) => a === w) !== -1
              ? 'opacity-100'
              : 'opacity-0',
          )}
        >
          <Icon name={elements[w].icon} size={16} />
          <span>{elements[w].title}</span>
        </div>
      ))}
    </div>
  );
}

export default observer(PerfWarnings);

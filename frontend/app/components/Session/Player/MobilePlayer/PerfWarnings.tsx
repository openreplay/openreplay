import {IosPerformanceEvent} from "Player/web/messages";
import React from 'react';
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';
import { mapIphoneModel } from 'Player/mobile/utils';
import cn from 'classnames';
import { connect } from 'react-redux';
import { NONE } from 'Duck/components/player';

type warningsType =
  | 'thermalState'
  | 'memoryWarning'
  | 'lowDiskSpace'
  | 'isLowPowerModeEnabled'
  | 'batteryLevel';

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
} as const;

function PerfWarnings({ userDevice, bottomBlock }: { userDevice: string; bottomBlock: number }) {
  const { store } = React.useContext(MobilePlayerContext);
  const { scale, performanceListNow, performanceList } = store.get()

  const allElements = Object.keys(elements) as warningsType[];
  const list = React.useMemo(() => allElements
    .filter(el => performanceList.findIndex((pw: IosPerformanceEvent & { techName: warningsType }) => pw.techName === el) !== -1)
  , [performanceList.length])

  const contStyles = {
    left: '50%',
    display: 'flex',
    marginLeft: `${(mapIphoneModel(userDevice).styles.shell.width / 2 + 10) * scale}px`,
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
    const warnings: warningsType[] = []
    performanceListNow.forEach((warn: IosPerformanceEvent & { techName: warningsType }) => {
      switch (warn.techName) {
        case 'thermalState':
          if (warn.value > 1) warnings.push(warn.techName) // 2 = serious 3 = overheating
          break;
        case 'memoryWarning':
          warnings.push(warn.techName)
          break;
        case 'lowDiskSpace':
          warnings.push(warn.techName)
          break;
        case 'isLowPowerModeEnabled':
          if (warn.value === 1) warnings.push(warn.techName)
          break;
        case 'batteryLevel':
          if (warn.value < 25) warnings.push(warn.techName)
          break;
      }
    })

    return warnings
  }, [performanceListNow.length]);
  if (bottomBlock !== NONE) return null;

  return (
    <div style={contStyles}>
      {list.map((w) => (
        <div
          className={cn(
            'transition-all flex items-center gap-1 bg-white border rounded px-2 py-1',
            activeWarnings.findIndex((a) => a === w) !== -1 ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Icon name={elements[w].icon} size={16} />
          <span>{elements[w].title}</span>
        </div>
      ))}
    </div>
  );
}

export default connect((state: any) => ({
  bottomBlock: state.getIn(['components', 'player', 'bottomBlock']),
}))(observer(PerfWarnings));

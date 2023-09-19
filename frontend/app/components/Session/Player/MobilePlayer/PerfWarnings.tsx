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

  const scale = store.get().scale;
  const updateWarnings = store.get().updateWarnings;

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

  // @ts-ignore
  const activeWarnings: warningsType[] = React.useMemo(() => {
    const warningsStateObj = store.get().warnings;
    return Object.keys(warningsStateObj).filter((key: warningsType) => warningsStateObj[key]);
  }, [updateWarnings]);

  const allElements = Object.keys(elements) as warningsType[];
  if (bottomBlock !== NONE) return null;

  const list = allElements.sort(
    (a, b) => activeWarnings.findIndex((w) => w === b) - activeWarnings.findIndex((w) => w === a)
  );
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

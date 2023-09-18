import React from 'react'
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from "mobx-react-lite";
import { Icon } from 'UI'
import { mapIphoneModel } from "Player/mobile/utils";

type warningsType = "thermalState" | "memoryWarning" | "lowDiskSpace" | "isLowPowerModeEnabled" | "batteryLevel"

const elements = {
  thermalState: {
    title: "Overheating",
    icon: <Icon name={"thermometer-sun"} />,
  },
  memoryWarning: {
    title: "High Memory Usage",
    icon: <Icon name={"memory-ios"} />
  },
  lowDiskSpace: {
    title: "Low Disk Space",
    icon: <Icon name={"low-disc-space"} />
  },
  isLowPowerModeEnabled: {
    title: "Low Power Mode",
    icon: <Icon name={"battery-charging"} />
  },
  batteryLevel: {
    title: "Low Battery",
    icon: <Icon name={"battery"} />
  }
}

function PerfWarnings({ userDevice }: { userDevice: string }) {
  const { store } = React.useContext(MobilePlayerContext);

  const scale = store.get().scale
  const warningsStateObj = store.get().warnings
  // @ts-ignore
  const activeWarnings: warningsType[] = Object.keys(warningsStateObj).filter((key: warningsType) => warningsStateObj[key])
  const contStyles = {
    left: '50%',
    display: 'flex',
    marginLeft: `${(mapIphoneModel(userDevice).styles.shell.width/2 + 10) * scale}px`,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '6px',
    position: 'absolute',
    width: '200px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 0,
  } as const
  return (
    <div style={contStyles}>
      {activeWarnings.map(w => (
        <div className={"flex items-center gap-1 bg-white border rounded p-1"}>
          {elements[w].icon}
          <span>{elements[w].title}</span>
        </div>
      ))}
    </div>
  )
}

export default observer(PerfWarnings)
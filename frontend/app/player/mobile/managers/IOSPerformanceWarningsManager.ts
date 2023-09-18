import ListWalker from "Player/common/ListWalker";
import type { IosPerformanceEvent } from "Player/web/messages";

export const performanceWarnings = ['thermalState', 'memoryWarning', 'lowDiskSpace', 'isLowPowerModeEnabled', 'batteryLevel']

export const INITIAL_STATE = {
  warnings: {
    thermalState: false,
    isLowPowerModeEnabled: false,
    memoryWarning: false,
    lowDiskSpace: false,
    batteryLevel: false,
  }
}

export type WarningsState = typeof INITIAL_STATE

export default class IOSPerformanceWarningsManager extends ListWalker<IosPerformanceEvent> {
  warnings = INITIAL_STATE.warnings

  public move(t: number) {
    const lastWarning = this.moveGetLast(t)
    if (lastWarning) {
      switch (lastWarning.name) {
        case 'thermalState':
          this.warnings.thermalState = lastWarning.value > 1 // 2 = serious 3 = overheating
          break;
        case 'memoryWarning':
          this.warnings.memoryWarning = true
          break;
        case 'lowDiskSpace':
          this.warnings.lowDiskSpace = true
          break;
        case 'isLowPowerModeEnabled':
          this.warnings.isLowPowerModeEnabled = lastWarning.value === 1
          break;
        case 'batteryLevel':
          this.warnings.batteryLevel = lastWarning.value < 25
          break;
      }
    }

    return this.warnings
  }
}
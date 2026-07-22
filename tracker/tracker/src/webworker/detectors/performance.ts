/**
 * Port of backend/pkg/messages/performance/performance.go.
 * Used by the CPU issue detector to turn raw frame ticks into a CPU-load %.
 */

export function timeDiff(t1: number, t2: number): number {
  if (t1 < t2) {
    return 0
  }
  return t1 - t2
}

export function tickRate(ticks: number, dt: number): number {
  if (dt === 0) {
    // dt of 0 would divide by zero; treat as a full tick rate (0% cpu load).
    return 1
  }
  let rate = (ticks * 30) / dt
  if (rate > 1) {
    rate = 1
  }
  return rate
}

export function cpuRateFromTickRate(rate: number): number {
  return 100 - Math.round(rate * 100)
}

export function cpuRate(ticks: number, dt: number): number {
  return cpuRateFromTickRate(tickRate(ticks, dt))
}

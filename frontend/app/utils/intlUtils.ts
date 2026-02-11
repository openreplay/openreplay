export function getLocalHourFormat(withSeconds = true): string {
  const date = new Date();
  const timeString = date.toLocaleTimeString();
  const hasAmPm =
    timeString.toLowerCase().includes('am') ||
    timeString.toLowerCase().includes('pm');
  return hasAmPm ? `hh:mm${withSeconds ? ':ss' : ''}a` : `HH:mm${withSeconds ? ':ss' : ''}`;
}

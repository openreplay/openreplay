export function getLocalHourFormat() {
  const date = new Date();
  const timeString = date.toLocaleTimeString();
  const hasAmPm =
    timeString.toLowerCase().includes('am') ||
    timeString.toLowerCase().includes('pm');
  return hasAmPm ? 'hh:mm:ss a' : 'HH:mm:ss';
}

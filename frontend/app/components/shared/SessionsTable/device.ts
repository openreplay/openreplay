import type Session from 'Types/session';

const OS_NAMES: [RegExp, string][] = [
  [/^ipados/i, 'iPadOS'],
  [/^ios/i, 'iOS'],
  [/^android/i, 'Android'],
  [/^(mac ?os|os ?x)/i, 'macOS'],
  [/^windows/i, 'Windows'],
  [/^chrome ?os/i, 'ChromeOS'],
  [/^linux/i, 'Linux'],
];
/** an OS in its own case: iOS, iPadOS, macOS */
export const osName = (os?: string | null) =>
  os ? (OS_NAMES.find(([re]) => re.test(os))?.[1] ?? os) : '';

const KNOWN_TYPES = ['desktop', 'mobile', 'tablet', 'console'];

const OS_DEVICE: Record<string, string> = {
  iPadOS: 'tablet',
  iOS: 'mobile',
  Android: 'mobile',
  macOS: 'desktop',
  Windows: 'desktop',
  ChromeOS: 'desktop',
  Linux: 'desktop',
};

/** the device type when set, else what the OS says, else the project's platform */
export function deviceKindOf(
  s: Pick<Session, 'userDeviceType' | 'userOs'>,
  mobileProject: boolean,
): string {
  const type = String(s.userDeviceType ?? '').toLowerCase();
  if (KNOWN_TYPES.includes(type)) return type;
  const byOs = OS_DEVICE[osName(s.userOs)];
  if (byOs) return byOs;
  return mobileProject ? 'mobile' : 'unknown';
}

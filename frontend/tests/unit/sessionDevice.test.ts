import { describe, expect, test } from '@jest/globals';

import {
  deviceKindOf,
  osName,
} from '../../app/components/shared/SessionsTable/device';

describe('session device', () => {
  test('the device type wins when it is set', () => {
    expect(
      deviceKindOf({ userDeviceType: 'tablet', userOs: 'iOS' } as any, false),
    ).toBe('tablet');
  });
  test('without a type, the OS decides', () => {
    expect(
      deviceKindOf({ userDeviceType: '', userOs: 'IOS' } as any, false),
    ).toBe('mobile');
    expect(
      deviceKindOf({ userDeviceType: '', userOs: 'iPadOS' } as any, false),
    ).toBe('tablet');
    expect(
      deviceKindOf({ userDeviceType: '', userOs: 'Android' } as any, false),
    ).toBe('mobile');
    expect(
      deviceKindOf({ userDeviceType: '', userOs: 'Mac OS X' } as any, false),
    ).toBe('desktop');
    expect(
      deviceKindOf(
        { userDeviceType: 'other', userOs: 'Windows' } as any,
        false,
      ),
    ).toBe('desktop');
  });
  test('then the project platform, then unknown', () => {
    expect(deviceKindOf({ userDeviceType: '', userOs: '' } as any, true)).toBe(
      'mobile',
    );
    expect(
      deviceKindOf({ userDeviceType: '', userOs: 'Plan9' } as any, false),
    ).toBe('unknown');
  });
  test('OS names in their own case', () => {
    expect(osName('IOS')).toBe('iOS');
    expect(osName('Mac OS X')).toBe('macOS');
    expect(osName('chrome os')).toBe('ChromeOS');
    expect(osName('Plan9')).toBe('Plan9');
  });
});

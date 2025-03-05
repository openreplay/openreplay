import { Avatar, Icon } from 'UI';
import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';
import { hashString } from 'Types/session/session';

interface IconProvider {
  getIcon(obj: any): React.ReactNode;
}

class BrowserIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    const s = obj.name.toLowerCase();
    let icon = 'color/browser/unknown';
    if (s.includes('chrome')) {
      icon = 'color/browser/chrome';
    } else if (s.includes('firefox')) {
      icon = 'color/browser/firefox';
    } else if (s.includes('safari')) {
      icon = 'color/browser/safari';
    } else if (s.includes('edge')) {
      icon = 'color/browser/edge';
    } else if (s.includes('opera')) {
      icon = 'color/browser/opera';
    } else if (s.includes('ie')) {
      icon = 'color/browser/ie';
    }

    return <Icon name={icon} size={24} />;
  }
}

class CountryIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    const s = obj.name.toUpperCase();
    if (Flags[s as keyof typeof Flags]) {
      const FlagComponent = Flags[s as keyof typeof Flags];
      return (
        <FlagComponent
          style={{
            width: 24,
            height: 24,
          }}
        />
      );
    }

    return <Icon name="flag-na" size={24} />;
  }
}

class IssueIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    const s = obj.name.toLowerCase();
    const icon = `color/issues/${s}`; // TODO use this line

    // if (s.includes('dead_click')) {
    //     icon = 'color/issues/dead_click';
    // } else if (s.includes('click_rage')) {
    //     icon = 'color/issues/click_rage';
    // } else if (s.includes('mouse_thrashing')) {
    //     icon = 'color/issues/mouse_thrashing';
    // } else if (s.includes('bad_request')) {
    //     icon = 'color/issues/bad_request';
    // } else if (s.includes('crash')) {
    //     icon = 'color/issues/crash';
    // }

    // @ts-ignore
    return <Icon name={icon} size={24} />;
  }
}

class UrlIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    return <Icon name="icn_url" size={24} />;
  }
}

class DeviceIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    const s = obj.name?.toLowerCase() || '';
    let icon = 'color/device/desktop';
    if (s.includes('desktop')) {
      icon = 'color/device/desktop';
    } else if (
      s.includes('mobile') ||
      s.includes('iphone') ||
      s === 'k' ||
      s.includes('android') ||
      s.includes('smartphone') ||
      s.includes('phone') ||
      s.includes('moto')
    ) {
      icon = 'color/device/mobile';
    } else if (s.includes('tablet')) {
      icon = 'color/device/tablet';
    } else {
      icon = 'color/device/desktop';
    }

    // @ts-ignore
    return <Icon name={icon} size={24} />;
  }
}

class OsIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    const s = obj.name.toLowerCase();
    if (s.includes('windows')) {
      return 'os/windows';
    }
    if (s.includes('mac')) {
      return 'os/mac';
    }
    if (s.includes('linux')) {
      return 'os/linux';
    }
    return 'os/unknown';
  }
}

class UserIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    return <Avatar seed={hashString(obj.name || 'Anounymous')} />;
  }
}

class ReferrerIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    return <Icon name="icn_referrer" size={24} />;
  }
}

class FetchIconProvider implements IconProvider {
  getIcon(obj: any): React.ReactNode {
    return <Icon name="icn_fetch-request" size={24} />;
  }
}

export {
  BrowserIconProvider,
  CountryIconProvider,
  IssueIconProvider,
  UrlIconProvider,
  DeviceIconProvider,
  OsIconProvider,
  UserIconProvider,
  ReferrerIconProvider,
  FetchIconProvider,
};
export type { IconProvider };

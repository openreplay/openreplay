import {Icon} from "UI";
import React from "react";
import * as Flags from "country-flag-icons/react/3x2";

interface IconProvider {
    getIcon(name: string): React.ReactNode;
}

class BrowserIconProvider implements IconProvider {
    getIcon(name: string): React.ReactNode {
        const s = name.toLowerCase();
        let icon = 'color/browser/unknown'
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

        return <Icon name={icon} size={24}/>
    }
}

class CountryIconProvider implements IconProvider {
    getIcon(name: string): React.ReactNode {
        const s = name.toUpperCase();
        if (Flags[s as keyof typeof Flags]) {
            const FlagComponent = Flags[s as keyof typeof Flags];
            return <FlagComponent style={{
                width: 24,
                height: 24
            }}/>
        }

        return <Icon name='flag-na' size={24}/>
    }
}

class IssueIconProvider implements IconProvider {
    getIcon(name: string): React.ReactNode {
        const s = name.toLowerCase();
        // let icon = 'event/' + s;  // TODO use this line
        let icon = 'event/clickrage';


        if (s.includes('dead_click')) {
            icon = 'event/clickrage';
        } else if (s.includes('click_rage')) {
            icon = 'event/clickrage';
        } else if (s.includes('mouse_thrashing')) {
            icon = 'event/clickrage';
        }
        return <Icon name={icon} size={24}/>
    }
}

class UrlIconProvider implements IconProvider {
    getIcon(name: string): React.ReactNode {
        return <Icon name="link-45deg" size={24}/>
    }
}

class DeviceIconProvider implements IconProvider {
    getIcon(name: string): React.ReactNode {
        const s = name.toLowerCase();
        let icon = 'color/device/desktop'
        if (s.includes('desktop')) {
            icon = 'color/device/desktop';
        } else if (
            s.includes('mobile') || s.includes('iphone') || s === 'k' || s.includes('android') ||
            s.includes('smartphone') || s.includes('phone') || s.includes('moto')
        ) {
            icon = 'color/device/mobile';
        } else if (s.includes('tablet')) {
            icon = 'color/device/tablet';
        } else {
            icon = 'color/device/desktop';
        }

        return <Icon name={icon} size={24}/>
    }
}

class OsIconProvider implements IconProvider {
    getIcon(name: string): React.ReactNode {
        const s = name.toLowerCase();
        if (s.includes('windows')) {
            return 'os/windows';
        } else if (s.includes('mac')) {
            return 'os/mac';
        } else if (s.includes('linux')) {
            return 'os/linux';
        } else {
            return 'os/unknown';
        }
    }
}

export {
    BrowserIconProvider,
    CountryIconProvider,
    IssueIconProvider,
    UrlIconProvider,
    DeviceIconProvider,
    OsIconProvider
};
export type {IconProvider};


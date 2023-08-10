export function osIcon(os) {
	let osIcon = os.toLocaleLowerCase().replace(/ /g, '_');
	if (osIcon.includes('mac')) {
		osIcon = 'mac_os_x';
	}
	return 'os/' + osIcon;
}

const browserNames = [ 'chrome', 'safari', 'firefox', 'opera', 'facebook', 'edge', 'ie' ];
export function browserIcon(browser) {
	if (typeof browser != 'string') return "browser/browser";
	const browserString = browser.toLocaleLowerCase();
	let browserName = 'browser';
	browserNames.some(bn => {
		if (browserString.includes(bn)) {
			browserName = bn;
			return true;
		}
		return false;
	});
	return `browser/${ browserName }`;
};

export function deviceTypeIcon(deviceType) {
	switch (deviceType) {
		case 'desktop':
			return 'desktop';
		case 'console':
		case 'mobile':
		case 'tablet':
		case 'phone':
			return 'mobile'
		default:
			return 'device';
	}
}

const ICON_LIST = [];

for (let i = 1; i <= 22; i++) {
	ICON_LIST.push(`icn_avatar${ i }`);
}
export function avatarIconName(seed = Math.floor(Math.random() * ICON_LIST.length)) {
	return `avatar/${ICON_LIST[ seed % ICON_LIST.length ]}`;
}
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

const ICON_LIST = ['icn_chameleon', 'icn_fox', 'icn_gorilla', 'icn_hippo', 'icn_horse', 'icn_hyena',
	'icn_kangaroo', 'icn_lemur', 'icn_mammel', 'icn_monkey', 'icn_moose', 'icn_panda',
	'icn_penguin', 'icn_porcupine', 'icn_quail', 'icn_rabbit', 'icn_rhino', 'icn_sea_horse',
	'icn_sheep', 'icn_snake', 'icn_squirrel', 'icn_tapir', 'icn_turtle', 'icn_vulture',
	'icn_wild1', 'icn_wild_bore'];
export function avatarIconName(seed = Math.floor(Math.random() * ICON_LIST.length)) {
	return `avatar/${ICON_LIST[ seed % ICON_LIST.length ]}`;
}
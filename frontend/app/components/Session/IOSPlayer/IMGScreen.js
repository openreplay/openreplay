import { observer } from 'mobx-react-lite';
import Screen from './ScreenWithLoaders';
import HTMLScreen from './HTMLScreen';

const MODEL_IMG_MAP = {
	"iPhone 12" : {
		img: "iPhone-12", // 723 × 1396
		screenY: 57,
		screenX: 60,
		//width: 723,
		screenWidth: 588,
		foreground: true,
	},
	"iPhone 11" : {
		img: "iPhone-11",
		screenY: 47,
		screenX: 45,
		screenWidth: 420,
		foreground: true,
	},
	"iPhone X" : {
		img: "iPhone-X",
		screenY: 41,
		screenX: 42,
		screenWidth: 380,
		foreground: true,
	},
	"iPhone 8" : {
		img: "iPhone-8",
		screenY: 113,
		screenX: 27,
		screenWidth: 382,
	},
	"iPhone 7" : {
		img: "iPhone-7", // 476 × 923
		screenY: 117,
		screenX: 43,
		screenWidth: 380,
	},
	"iPhone 6" : {
		img: "iPhone-6", // 540 × 980
		screenY: 149,
		screenX: 81,
		screenWidth: 376,
	},
	"iPad (7th generation)" : {
		img: "iPad-7th", // 965 × 1347
		screenY: 122,
		screenX: 66,
		screenWidth: 812,
		foreground: true,
	},
	"iPad Pro (12.9-inch)" : {
		img: "iPad-pro-12.9-2020", // 1194 × 1536
		screenY: 78,
		screenX: 78,
		screenWidth: 1025,
		foreground: true,
	},
	"iPad Pro (11-inch)" : {
		img: "iPad-pro-11-2020", // 996 × 1353
		screenY: 73,
		screenX: 72,
		screenWidth: 836,
		foreground: true,
	},
	"iPad Air" : {
		img: "iPad-Air",
		screenY: 162,
		screenX: 123,
		screenWidth: 768,
	},
	"iPad Air 2": {
		img: "iPad-Air-2",
		screenY: 165,
		screenX: 118,
		screenWidth: 776,
	},
}


function getImgInfo(type) {
	let imgInfo;
	Object.keys(MODEL_IMG_MAP).map(key => {
		if (type.startsWith(key)) {
			imgInfo = MODEL_IMG_MAP[key];
		}
	});
	return imgInfo;
}


function IMGScreen(props) {
	const imgInfo = getImgInfo(props.device);
	if (!imgInfo) { 
		return <HTMLScreen {...props } />;
	}
	const { wrapperId, player, screenId } = props;

	const curScreenWidth = player.state.orientationLandscape ? player.state.height : player.state.width;
	return (
		<div id={wrapperId} className="relative">
			<Screen className="absolute inset-0" screenId={ screenId } player={player} />
			<img 
				className="absolute" 
				style={{ 
					maxWidth: 'none',
					zIndex: imgInfo.foreground ? 0 : -1,
					transformOrigin: `${imgInfo.screenX}px ${imgInfo.screenY}px`,
					transform: `
						translate(-${imgInfo.screenX}px, -${imgInfo.screenY}px)
						scale(${ curScreenWidth/imgInfo.screenWidth }) 
						${player.state.orientationLandscape ? console.log('wtdf') || `rotate(-90deg) translateX(-${imgInfo.screenWidth}px)` : ''}
					`,
				}} 
				src={`/assets/img/ios/${imgInfo.img}.png`}
			/>
		</div>
	);
}

export default observer(IMGScreen);

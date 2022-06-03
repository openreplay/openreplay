import ListWalker from '../MessageDistributor/managers/ListWalker';

//URL.revokeObjectURL() !!
function binaryToDataURL(arrayBuffer){
	var blob = new Blob([new Uint8Array(arrayBuffer)], {'type' : 'image/jpeg'});
	return URL.createObjectURL(blob);
}

function prepareImage(width, height, arrayBuffer) {
	const dataURL = binaryToDataURL(arrayBuffer);
	return {
		loadImage: new Promise(resolve => {
			const img = new Image();
			img.onload = function() {
	      //URL.revokeObjectURL(this.src);
	      resolve(img);
	    };
	    img.src = dataURL;   
		}).then(),
		dataURL,
	};
}

export default class ScreenList {
	_walker = new ListWalker();
	_insertUnique(m) {
		let p = this._walker._list.length;
		while (p > 0 && this._walker._list[ p - 1 ].time > m.time) {
			p--;
		}
		if (p > 0 && this._walker._list[ p - 1 ].time === m.time) {
			return;
		}
		this._walker._list.splice(p, 0, m);
	}

	moveGetLast(time) {
		return this._walker.moveGetLast(time);
	}

	insertScreen(time, width, height, arrayBuffer): void {
		this._insertUnique({
			time,
			width,
			height,
			...prepareImage(width, height, arrayBuffer),
			//image: new ImageData(new Uint8ClampedArray(arrayBuffer), width, height),
			// dataURL: binaryToDataURL(arrayBuffer)
		});
	}

	clean() {
		this._walker.forEach(m => {
			URL.revokeObjectURL(m.dataURL); 
		});
	}
}
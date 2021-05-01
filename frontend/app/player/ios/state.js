import { makeAutoObservable } from "mobx"

//configure ({empceActions: true})

export const 
	NONE = 0,
  CRASHES = 1,
  NETWORK = 2,
  LOGS = 3,
  EVENTS = 4,
  CUSTOM = 5,
  PERFORMANCE = 6;

export function createToolPanelState() {
	return makeAutoObservable({
		key: NONE,
		toggle(key) { // auto-bind?? 
			this.key = this.key === key ? NONE : key; 
		},
		close() {
			this.key = NONE;
		},
	});
}


export function createToggleState() {
	return makeAutoObservable({
		enabled: false,
		toggle(flag) {
			this.enabled = typeof flag === 'boolean' 
				? flag
				: !this.enabled;
		},
		enable() {
			this.enabled = true;
		},
		disable() {
			this.enabled = false;
		},
	});
}

const SPEED_STORAGE_KEY = "__$player-speed$__";
//const SKIP_STORAGE_KEY = "__$player-skip$__";
//const initialSkip = !!localStorage.getItem(SKIP_STORAGE_KEY);

export const 
	INITIALIZING = 0,
	PLAYING = 1,
	PAUSED = 2,
	COMPLETED = 3,
	SOCKET_ERROR = 5;

export const 
	PORTRAIT = 1,
 	LANDSCAPE = 2;

export function createPlayerState(state) {
	const storedSpeed = +localStorage.getItem(SPEED_STORAGE_KEY);
	const initialSpeed = [1,2,3].includes(storedSpeed) ? storedSpeed : 1;

	return makeAutoObservable({
		status: INITIALIZING,
		_statusSaved: null,
		setTime(t) {
			this.time = t
		},
		time: 0,
		endTime: 0,
		setStatus(status) {
			this.status = status;
		},
		get initializing() {
			return this.status === INITIALIZING;
		},
		get playing() {
			return this.status === PLAYING;
		},
		get completed() {
			return this.status === COMPLETED;
		},
		_buffering: false,
		get buffering() {
			return this._buffering;
		},
		setBufferingState(flag = true) {
			this._buffering = flag;
		},
		speed: initialSpeed,
		setSpeed(speed) {
			localStorage.setItem(SPEED_STORAGE_KEY, speed);
			this.speed = speed;
		},
		width: 360,
		height: 780,
		orientation: PORTRAIT,
		get orientationLandscape() {
			return this.orientation === LANDSCAPE;
		},
		setSize(width, height) {
			if (height < 0 || width < 0) {
				console.log("Player: wrong non-positive size")
				return;
			}
			this.width = width;
			this.height = height;
			this.orientation = width > height ? LANDSCAPE : PORTRAIT; 
		},
		...state,
	});
}

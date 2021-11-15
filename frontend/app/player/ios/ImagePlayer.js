import { io } from 'socket.io-client';
import { makeAutoObservable, autorun } from 'mobx';
import logger from 'App/logger';
import { 
  createPlayerState,
  createToolPanelState,
  createToggleState,
  PLAYING,
  PAUSED,
  COMPLETED,
  SOCKET_ERROR,

  CRASHES,
  LOGS,
  NETWORK,
  PERFORMANCE,
  CUSTOM,
  EVENTS, // last evemt +clicks
} from "./state";
import {
  createListState,
  createScreenListState,
} from './lists';
import Parser from './Parser';
import PerformanceList from './PerformanceList';

const HIGHEST_SPEED = 3;


export default class ImagePlayer {
  _screen = null
  _wrapper = null
  _socket = null
  toolPanel = createToolPanelState()
  fullscreen = createToggleState()
  lists = {
    [LOGS]: createListState(),
    [NETWORK]: createListState(),
    [CRASHES]: createListState(),
    [EVENTS]: createListState(),
    [CUSTOM]: createListState(),
    [PERFORMANCE]: new PerformanceList(),
  }
  _clicks = createListState()
  _screens = createScreenListState()
  
  constructor(session) {
    this.state = createPlayerState({ 
      endTime: session.duration.valueOf(),
    });
    //const canvas = document.createElement("canvas");
    // this._context = canvas.getContext('2d');
    // this._img = new Image();
    // this._img..onerror = function(e){
    //    logger.log('Error during loading image:', e);
    // };
    // wrapper.appendChild(this._img);
    session.crashes.forEach(c => this.lists[CRASHES].append(c));
    session.events.forEach(e => this.lists[EVENTS].append(e));
    session.stackEvents.forEach(e => this.lists[CUSTOM].append(e));
    window.fetch(session.mobsUrl)
    .then(r => r.arrayBuffer())
    .then(b => {
      new Parser(new Uint8Array(b)).parseEach(m => {
        m.time = m.timestamp - session.startedAt;
        try {
          if (m.tp === "ios_log") {
            this.lists[LOGS].append(m);
          } else if (m.tp === "ios_network_call") {
            this.lists[NETWORK].append(m);
          // } else if (m.tp === "ios_custom_event") {
          //   this.lists[CUSTOM].append(m);
          } else if (m.tp === "ios_click_event") {
            m.time -= 600; //for graphic initiation
            this._clicks.append(m);
          } else if (m.tp === "ios_performance_event") {
            this.lists[PERFORMANCE].append(m);
          }
        } catch (e) {
          logger.error(e);
        }
      });
      Object.values(this.lists).forEach(list => list.moveToLast(0)); // In case of negative values
    })

    if (session.socket == null || typeof session.socket.jwt !== "string" || typeof session.socket.url !== "string") {
      logger.error("No socket info found fpr session", session);
      return
    }

    const options = {
      extraHeaders: {Authorization: `Bearer ${session.socket.jwt}`},
      reconnectionAttempts: 5,
      //transports: ['websocket'],
    }

    const socket = this._socket = io(session.socket.url, options);
    socket.on("connect", () => {
        logger.log("Socket Connected");
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        return;
      }
      logger.error("Disconnected. Reason: ", reason)
      // if (reason === 'io server disconnect') {
      //   socket.connect();
      // }
    });
    socket.on('connect_error', (e) => {
      this.state.setState(SOCKET_ERROR);
      logger.error(e)
    });

    socket.on('screen', (time, width, height, binary) => {
      //logger.log("New Screen!", time, width, height, binary);
      this._screens.insertScreen(time, width, height, binary);
    });
    socket.on('buffered', (playTime) => {
      if (playTime === this.state.time) {
        this.state.setBufferingState(false);
      }    
      logger.log("Play ack!", playTime);
    });

    let startPingInterval;
    socket.on('start', () => {
      logger.log("Started!");
      clearInterval(startPingInterval)
      this.state.setBufferingState(true);
      socket.emit("speed", this.state.speed);
      this.play();
    });
    startPingInterval = setInterval(() => socket.emit("start"), 1000);
    socket.emit("start");

    window.addEventListener("resize", this.scale);
    autorun(this.scale);
  }

  _click
  _getClickElement() {
    if (this._click != null) {
      return this._click;
    }
    const click = document.createElement('div');
    click.style.position = "absolute";
    click.style.background = "#ddd";
    click.style.border = "solid 4px #bbb";
    click.style.borderRadius = "50%";
    click.style.width = "32px";
    click.style.height = "32px";
    click.style.transformOrigin = "center";
    return this._click = click;
  }
  // More sufficient ways?
  _animateClick({ x, y }) {
    if (this._screen == null) {
      return;
    }
    const click = this._getClickElement();
    if (click.parentElement == null) {
      this._screen.appendChild(click);
    }
    click.style.transition = "none";
    click.style.left = `${x-18}px`;
    click.style.top = `${y-18}px`;
    click.style.transform = "scale(1)";
    click.style.opacity = "1";
    setTimeout(() => {
      click.style.transition = "all ease-in .5s";
      click.style.transform = "scale(0)";
      click.style.opacity = "0";
    }, 0)
  }

  _updateFrame({ image, width, height }) {
   // const img = new Image();
   // img.onload = () => {
   //  this._context.drawImage(img);
   // };
   // img.onerror = function(e){
   //  logger.log('Error during loading image:', e);
   // };
   // this._screen.style.backgroundImage = `url(${binaryToDataURL(binaryArray)})`;
    this._canvas.getContext('2d').drawImage(image, 0, 0, this._canvas.width, this._canvas.height);
  }

  _setTime(ts) {
    ts = Math.max(Math.min(ts, this.state.endTime), 0);
    this.state.setTime(ts);
    Object.values(this.lists).forEach(list => list.moveToLast(ts));
    const screen = this._screens.moveToLast(ts);
    if (screen != null) {
      const { dataURL, width, height } = screen;
      this.state.setSize(width, height);
      //imagePromise.then(() => this._updateFrame({ image, width, height }));
      //this._screen.style.backgroundImage = `url(${screen.dataURL})`;
      screen.loadImage.then(() => this._screen.style.backgroundImage = `url(${screen.dataURL})`);
    }
    const lastClick = this._clicks.moveToLast(ts);
    if (lastClick != null && lastClick.time > ts - 600) {
      this._animateClick(lastClick);
    }
  }

  attach({ wrapperId, screenId }) {
    const screen = document.getElementById(screenId);
    if (!screen) {
      throw new Error(`ImagePlayer: No screen element found with ID "${screenId}" `);
    }
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) {
      throw new Error(`ImagePlayer: No wrapper element found with ID "${wrapperId}" `);
    }
    screen.style.backgroundSize = "contain";
    screen.style.backgroundPosition = "center";
    wrapper.style.position = "absolute";
    wrapper.style.transformOrigin = "left top";
    wrapper.style.top = "50%";
    wrapper.style.left = "50%";
    // const canvas = document.createElement('canvas');
    // canvas.style.width = "300px";
    // canvas.style.height = "600px";
    // screen.appendChild(canvas);
    // this._canvas = canvas;
    this._screen = screen;
    this._wrapper = wrapper;
    this.scale();
  }


  get loading() {
    return this.state.initializing;
  }

  get buffering() {
    return this.state.buffering;
  }

  // get timeTravelDisabled() {
  //   return this.state.initializing;
  // }

  get controlsDisabled() {
    return this.state.initializing; //|| this.state.buffering;
  }

  _animationFrameRequestId = null
  _stopAnimation() {
    cancelAnimationFrame(this._animationFrameRequestId);
  }
  _startAnimation() {
    let prevTime = this.state.time;
    let animationPrevTime = performance.now();
    const nextFrame = (animationCurrentTime) => {
      const { 
        speed, 
        //skip, 
        //skipIntervals, 
        endTime,
        playing,
        buffering,
        //live, 
        //livePlay,
        //disconnected,
        //messagesLoading,
        //cssLoading,
      } = this.state;

      const diffTime = !playing || buffering
        ? 0
        : Math.max(animationCurrentTime - animationPrevTime, 0) * speed;

      let time = prevTime + diffTime;

      //const skipInterval = skip && skipIntervals.find(si => si.contains(time));  // TODO: good skip by messages
      //if (skipInterval) time = skipInterval.end;

      //const fmt = this.getFirstMessageTime();
      //if (time < fmt) time = fmt; // ?

      //const lmt = this.getLastMessageTime();
      //if (livePlay && time < lmt) time = lmt;
      // if (endTime < lmt) {
      //   update({
      //     endTime: lmt,
      //   });
      // }

      prevTime = time;
      animationPrevTime = animationCurrentTime;

      const completed = time >= endTime;
      if (completed) {
        this._setComplete();
      } else {

        // if (live && time > endTime) {
        //   update({
        //     endTime: time,
        //   });
        // }
        this._setTime(time);
        this._animationFrameRequestId = requestAnimationFrame(nextFrame);
      }
    };
    this._animationFrameRequestId = requestAnimationFrame(nextFrame);
  }


  scale = () => {
    const { height, width } = this.state; // should be before any return for mobx observing
    if (this._wrapper === null) return;
    const parent = this._wrapper.parentElement;
    if (parent === null) return;
    let s = 1;
    const { offsetWidth, offsetHeight } = parent;

    s = Math.min(offsetWidth / width, (offsetHeight - 20) / height);
    if (s > 1) {
      s = 1;
    } else {
      s = Math.round(s * 1e3) / 1e3;
    }

    this._wrapper.style.transform =  `scale(${ s }) translate(-50%, -50%)`;
    this._wrapper.style.width = width + 'px';
    this._wrapper.style.height =  height + 'px';
    // this._canvas.style.width = width + 'px';
    // this._canvas.style.height = height + 'px';
  }

  _setComplete() {
    this.state.setStatus(COMPLETED);
    this._setTime(this.state.endTime);
    if (this._socket != null) {
      this._socket.emit("pause");
    }
  }


  _pause() {
    this._stopAnimation();
    this.state.setStatus(PAUSED);
  }

  pause = () => {
    this._pause();
    if (this._socket != null) {
     this._socket.emit("pause");
    }
  }

  _play() {
    if (!this.state.playing) {
      this._startAnimation();
    }
    this.state.setStatus(PLAYING);
  }
  play = () => {
    this._play()
    if (this._socket != null) {
      this._socket.emit("resume");
    }
  }

  _jump(ts) {
    if (this.state.playing) {
      this._stopAnimation();
      this._setTime(ts);
      this._startAnimation();
    } else {
      this._setTime(ts);
      this.state.setStatus(PAUSED); // for the case when completed
    }
  }
  jump = (ts) => {
    ts = Math.round(ts); // Should be integer
    this._jump(ts);
    if (this._socket != null) {
      this.state.setBufferingState(true);
      console.log("Send play on jump!", ts)
      this._socket.emit("jump", ts);
    }
  }

  togglePlay = () => {
    if (this.state.playing) {
      this.pause()
    } else {
      if (this.state.completed) {
        //this.state.time = 0;
        this.jump(0)
      }
      this.play()
    }
  }
  backTenSeconds = () => {
    this.jump(Math.max(this.state.time - 10000, 0));
  }
  forthTenSeconds = () => {
    this.jump(Math.min(this.state.time + 10000, this.state.endTime));
  }

  _setSpeed(speed) {
    if (this._socket != null) {
     this._socket.emit("speed", speed);
    }
    this.state.setSpeed(speed)
  }

  toggleSpeed = () => {
    const speed = this.state.speed;
    this._setSpeed(speed < HIGHEST_SPEED ? speed + 1 : 1);
  }

  speedUp = () => {
    const speed = this.state.speed;
    this._setSpeed(Math.min(HIGHEST_SPEED, speed + 1));
  }

  speedDown = () =>  {
    const speed = this.state.speed;
    this._setSpeed(Math.max(1, speed - 1));
  }

  togglePanel = (key) => {
    this.toolPanel.toggle(key);
    setTimeout(() => this.scale(), 0);
  }

  closePanel = () => {
    this.toolPanel.close();
    setTimeout(() => this.scale(), 0);
  }

  toggleFullscreen = (flag = true) => {
    this.fullscreen.toggle(flag);
    setTimeout(() => this.scale(), 0);
  }


  clean() {
    this._stopAnimation();
    if (this._socket != null) {
      //this._socket.emit("close");
      this._socket.close();
    }
    this._screens.clean();
  }
}


/**
 * 24 MB; hardlimit for video chunk
 * */
const hardLimit = 24 * 1024 * 1024; // 24 MB

function getRecordingSettings(qualityValue) {
  const settingsMap = {
    "4k": { audioBitsPerSecond: 192000, videoBitsPerSecond: 40000000, width: 4096, height: 2160 },
    "1080p": { audioBitsPerSecond: 192000, videoBitsPerSecond: 8000000, width: 1920, height: 1080 },
    // @default
    "720p": { audioBitsPerSecond: 96000, videoBitsPerSecond: 2500000, width: 1280, height: 720 },
    "480p": { audioBitsPerSecond: 96000, videoBitsPerSecond: 2500000, width: 854, height: 480 },
    "360p": { audioBitsPerSecond: 96000, videoBitsPerSecond: 1000000, width: 640, height: 360 },
    "240p": { audioBitsPerSecond: 64000, videoBitsPerSecond: 500000, width: 426, height: 240 },
  };

  const defaultSettings = { audioBitsPerSecond: 128000, videoBitsPerSecond: 5000000, width: 1920, height: 1080 };
  const { audioBitsPerSecond, videoBitsPerSecond, width, height } = settingsMap[qualityValue] || defaultSettings;
  const duration = 3 * 60 * 1000; // 3 minutes

  const mimeTypes = [
    // fastest trimming and HLS
    "video/webm;codecs=h264",
    "video/webm;codecs=avc1",
    "video/webm;codecs=av1",
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp8,opus",
    // best performance
    "video/webm;codecs=vp9,opus",
  ];

  let mimeType = mimeTypes[0];

  const constrains = {
    frameRate: {
      min: 20,
      max: 30,
    },
    audio: true,
    video: {
      width: {
        exact: width,
      },
      height: {
        exact: height,
      },
    },
  };

  const result = {
    constrains,
    mimeType,
    audioBitsPerSecond,
    videoBitsPerSecond,
    duration,
  };
  return result;
}

class ScreenRecorder {
  isRecording = false;
  videoBlob = null;
  videoUrl = null;
  duration = 0;
  mRecorder;
  videoStream;

  constructor() {
    this.isRecording = false;
    this.mRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.settings = null;
    this.audioTrack = null;
  }

  clearAll() {
    this.isRecording = false;
    this.videoBlob = null;
    this.videoUrl = null;
    this.duration = 0;
    this.mRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.audioTrack = null;
  }

  init(settings) {
    this.settings = settings;
  }

  durationInt = null;
  trackDuration = () => {
    this.durationInt = setInterval(() => {
      this.duration += 1000;
    }, 1000);
  };

  clearDurationInterval = () => {
    clearInterval(this.durationInt);
    this.durationInt = null;
  };

  async startRecording(type, streamId, microphone = false, audioId) {
    this.duration = 0;
    if (this.isRecording) {
      throw new Error("Called startRecording while recording is in progress.");
    }
    const combinedStream = await this._getStream(
      type,
      streamId,
      microphone,
      audioId,
    );

    this.stream = combinedStream;
    this.mRecorder = new MediaRecorder(combinedStream, {
      mimeType: this.settings.mimeType,
      audioBitsPerSecond: this.settings.audioBitsPerSecond,
      videoBitsPerSecond: this.settings.videoBitsPerSecond,
      videoKeyFrameIntervalDuration: 1000,
    });

    this.mRecorder.ondataavailable = this._handleDataAvailable;
    this.mRecorder.onstop = this._handleStop;

    this.mRecorder.start();
    this.isRecording = true;
    this.trackDuration();
  }

  stop() {
    if (this.mRecorder) {
      this.mRecorder.stop();
      this.mRecorder = null;
    }

    const clearAll = () => {
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.audioTrack) {
        this.audioTrack.stop();
        this.audioTrack = null;
      }
      this.isRecording = false;
      this.clearDurationInterval();
    };

    if (!this.recorded) {
      let tries = 0;
      const int = setInterval(() => {
        if (this.recorded || tries > 20) {
          clearInterval(int);
          clearAll();
          this.recorded = false;
          if (tries > 20) {
            console.error("Failed to stop recording properly");
          }
        }
        tries++;
      }, 250);
    } else {
      clearAll();
    }
  }

  pause() {
    if (this.mRecorder) {
      this.mRecorder.pause();
      this.clearDurationInterval();
    }
  }

  resume() {
    if (this.mRecorder) {
      this.mRecorder.resume();
      this.trackDuration();
    }
  }

  muteMicrophone() {
    if (this.audioTrack) {
      this.audioTrack.enabled = false;
    }
  }

  async unmuteMicrophone() {
    if (this.audioTrack) {
      this.audioTrack.enabled = true;
    }
  }

  async _getStream(type, streamId, useMicrophone = false, audioId) {
    const constraints = this.settings;
    this.videoStream = null;
    let microphoneStream = null;
    try {
      this.videoStream = await (type === "tab"
        ? navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: "tab",
                chromeMediaSourceId: streamId,
              },
            },
            video: {
              mandatory: {
                chromeMediaSource: "tab",
                chromeMediaSourceId: streamId,
              },
            },
          })
        : navigator.mediaDevices.getDisplayMedia({
            ...constraints,
            video: {
              ...constraints.video,
              displaySurface: "monitor",
            },
          }));
    } catch (e) {
      console.error('get stream error:', e);
      throw e;
    }
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, deviceId: audioId },
      });
      this.audioTrack = microphoneStream.getAudioTracks()[0];
      if (!useMicrophone) {
        this.audioTrack.enabled = false;
      }
    } catch (e) {
      console.error('get audio error', e);
      this.audioTrack = this.createPlaceholderAudioTrack();
    }

    const existingAudioTracks = this.videoStream.getAudioTracks();
    if (existingAudioTracks.length > 0) {
      existingAudioTracks.forEach(track => track.enabled = true);
    }

    return new MediaStream([
      ...this.videoStream.getVideoTracks(),
      this.audioTrack,
    ]);
  }

  createPlaceholderAudioTrack = () => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();

    oscillator.connect(gainNode);
    gainNode.connect(destination);
    gainNode.gain.value = 0; // Set volume to 0
    oscillator.start();

    return destination.stream.getAudioTracks()[0];
  };

  _handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      this.chunks.push(event.data);
    }
  };

  recorded = false;
  _handleStop = () => {
    const blob = new Blob(this.chunks, { type: this.settings.mimeType });
    const url = URL.createObjectURL(blob);

    this.videoBlob = blob;
    this.videoUrl = url;
    this.videoStream.getTracks().forEach((track) => track.stop());
    if (this.audioTrack) {
      this.audioTrack.stop();
    }
    this.recorded = true;
  };

  getVideoData = (iteration = 0) => {
    return new Promise((resolve) => {
      if (this.recorded) {
        resolve({
          blob: this.videoBlob,
          mtype: this.settings.mimeType,
        });
      } else {
        if (iteration > 10 * 1000) {
          return resolve({ blob: null, mtype: null });
        }
        setTimeout(() => {
          resolve(this.getVideoData(iteration++));
        }, 100);
      }
    });
  };
}

let recorder = new ScreenRecorder();
recorder.init(getRecordingSettings("720p"));
browser.runtime.onMessage.addListener((message, _, respond) => {
  if (message.target === "offscreen") {
    if (message.type === "offscr:start-recording") {
      recorder.clearAll();
      recorder
        .startRecording(
          message.area,
          message.data,
          message.microphone,
          message.audioId,
        )
        .then(() => {
          respond({ success: true, time: Date.now() });
        })
        .catch(e => {
          console.error(e);
          respond({ success: false, time: Date.now() });
        })
      return true;
    }
    if (message.type === "offscr:get-ts") {
      respond({ time: recorder.duration });
      return true;
    }
    if (message.type === "offscr:check-status") {
      respond({ status: recorder.isRecording, time: recorder.duration });
      return true;
    }
    if (message.type === "offscr:stop-discard") {
      recorder.stop();
      recorder.clearAll();
    }
    if (message.type === "offscr:stop-recording") {
      recorder.stop();
      const duration = recorder.duration;
      recorder.getVideoData().then((data) => {
        if (!data.blob) {
          respond({ status: "empty" });
        }
        convertBlobToBase64(data.blob).then(({ result, size }) => {
          if (size > hardLimit) {
            respond({ status: "parts" });
            result.forEach((chunk, i) => {
              void browser.runtime.sendMessage({
                type: "offscr:video-data-chunk",
                data: chunk,
                index: i,
                total: result.length,
                duration,
              });
            });
          } else {
            respond({ status: "full", base64data: result, duration });
          }
          recorder.clearAll();
        });
      });
      return true;
    }
    if (message.type === "offscr:pause-recording") {
      recorder.pause();
      return "paused";
    }
    if (message.type === "offscr:resume-recording") {
      recorder.resume();
      return "resumed";
    }
    if (message.type === "offscr:mute-microphone") {
      recorder.muteMicrophone();
      return "muted";
    }
    if (message.type === "offscr:unmute-microphone") {
      void recorder.unmuteMicrophone();
      return "unmuted";
    }
    return "miss";
  }
});

const convertBlobToBase64 = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    try {
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const parts = [];
        const base64data = reader.result;
        if (base64data.length > hardLimit) {
          const chunkSize = hardLimit;
          for (let i = 0; i < base64data.length; i += chunkSize) {
            parts.push(base64data.slice(i, i + chunkSize));
          }
        } else {
          parts.push(base64data);
        }
        resolve({
          result: parts,
          size: base64data.length,
        });
      };
    } catch (e) {
      console.error(e, blob, reader);
    }
  });

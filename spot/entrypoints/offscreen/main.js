// @ts-nocheck
/**
 * 24 MB; hardlimit for message chunk (base64 string payload)
 */
const hardLimit = 24 * 1024 * 1024; // 24 MB

function getRecordingSettings(qualityValue) {
  const settingsMap = {
    '4k': {
      audioBitsPerSecond: 192000,
      videoBitsPerSecond: 40000000,
      width: 4096,
      height: 2160,
    },
    '1080p': {
      audioBitsPerSecond: 192000,
      videoBitsPerSecond: 8000000,
      width: 1920,
      height: 1080,
    },
    // @default
    '720p': {
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
      width: 1280,
      height: 720,
    },
    '480p': {
      audioBitsPerSecond: 96000,
      videoBitsPerSecond: 2500000,
      width: 854,
      height: 480,
    },
    '360p': {
      audioBitsPerSecond: 96000,
      videoBitsPerSecond: 1000000,
      width: 640,
      height: 360,
    },
    '240p': {
      audioBitsPerSecond: 64000,
      videoBitsPerSecond: 500000,
      width: 426,
      height: 240,
    },
  };

  const defaultSettings = {
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: 5000000,
    width: 1920,
    height: 1080,
  };

  const { audioBitsPerSecond, videoBitsPerSecond, width, height } =
    settingsMap[qualityValue] || defaultSettings;

  const duration = 3 * 60 * 1000; // 3 minutes

  const mimeTypes = [
    // mp4-first for faster HLS encoding backend path
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
  ];

  let mimeType = mimeTypes[0];
  if (MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mimeType)) {
    for (let i = 1; i < mimeTypes.length; i++) {
      if (MediaRecorder.isTypeSupported(mimeTypes[i])) {
        mimeType = mimeTypes[i];
        break;
      }
    }
  }

  const constraints = {
    frameRate: { min: 20, max: 30 },
    audio: true,
    video: { width: { ideal: width }, height: { ideal: height } },
  };

  return {
    constraints,
    mimeType,
    // for retry/fallback logic at recorder construction time
    mimeTypeCandidates: mimeTypes,
    audioBitsPerSecond,
    videoBitsPerSecond,
    duration,
  };
}

class ScreenRecorder {
  audioCtx = null;
  mixDest = null;
  tabSource = null;
  micSource = null;

  isRecording = false;
  duration = 0;

  mRecorder = null;
  stream = null;
  videoStream = null;
  audioTrack = null;

  videoBlob = null;
  videoUrl = null;

  _stopPromise = null;
  _stopResolve = null;
  _stopReject = null;

  _effectiveMimeType = null;

  _placeholderAudioCtx = null;
  _placeholderOsc = null;

  constructor() {
    this.chunks = [];
    this.settings = null;
    this.durationInt = null;

    this.recorded = false;
    this._fallbackTried = false;
  }

  init(settings) {
    this.settings = settings;
  }

  trackDuration = () => {
    if (this.durationInt) return;
    this.durationInt = setInterval(() => {
      this.duration += 1000;
    }, 1000);
  };

  clearDurationInterval = () => {
    if (this.durationInt) clearInterval(this.durationInt);
    this.durationInt = null;
  };

  _cleanupAudioGraph = async () => {
    try {
      this.tabSource && this.tabSource.disconnect();
      this.micSource && this.micSource.disconnect();
      this.tabSource = null;
      this.micSource = null;
      this.mixDest = null;

      if (this.audioCtx) {
        try {
          await this.audioCtx.close();
        } catch (e) {}
        this.audioCtx = null;
      }

      if (this._placeholderOsc) {
        try {
          this._placeholderOsc.stop();
        } catch (e) {}
        this._placeholderOsc = null;
      }
      if (this._placeholderAudioCtx) {
        try {
          await this._placeholderAudioCtx.close();
        } catch (e) {}
        this._placeholderAudioCtx = null;
      }
    } catch (e) {
      console.warn('audio cleanup error:', e);
    }
  };

  clearAll() {
    this.clearDurationInterval();

    try {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (e) {}
        });
      }
    } catch (e) {}

    try {
      if (this.videoStream) {
        this.videoStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (e) {}
        });
      }
    } catch (e) {}

    try {
      if (this.audioTrack) {
        try {
          this.audioTrack.stop();
        } catch (e) {}
      }
    } catch (e) {}

    void this._cleanupAudioGraph();

    try {
      if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
    } catch (e) {}

    this.isRecording = false;
    this.duration = 0;

    this.mRecorder = null;
    this.stream = null;
    this.videoStream = null;
    this.audioTrack = null;

    this.videoBlob = null;
    this.videoUrl = null;
    this.chunks = [];

    this.recorded = false;
    this._fallbackTried = false;

    this._stopPromise = null;
    this._stopResolve = null;
    this._stopReject = null;

    this._effectiveMimeType = null;
  }

  pause() {
    if (this.mRecorder && this.isRecording) {
      try {
        this.mRecorder.pause();
      } catch (e) {}
      this.clearDurationInterval();
    }
  }

  resume() {
    if (this.mRecorder && this.isRecording) {
      try {
        this.mRecorder.resume();
      } catch (e) {}
      this.trackDuration();
    }
  }

  muteMicrophone() {
    if (this.audioTrack) this.audioTrack.enabled = false;
  }

  unmuteMicrophone() {
    if (this.audioTrack) this.audioTrack.enabled = true;
  }

  _createStopPromise = () => {
    if (this._stopPromise) return this._stopPromise;
    this._stopPromise = new Promise((resolve, reject) => {
      this._stopResolve = resolve;
      this._stopReject = reject;
    });
    return this._stopPromise;
  };

  async startRecording(type, streamId, microphone = false, audioId) {
    if (!this.settings) throw new Error('Recorder settings not initialized.');
    if (this.isRecording) {
      throw new Error('Called startRecording while recording is in progress.');
    }

    this.duration = 0;
    this.recorded = false;
    this._fallbackTried = false;
    this.chunks = [];

    const combinedStream = await this._getStream(type, streamId, microphone, audioId);
    this.stream = combinedStream;

    const recorderOpts = {
      audioBitsPerSecond: this.settings.audioBitsPerSecond,
      videoBitsPerSecond: this.settings.videoBitsPerSecond,
      videoKeyFrameIntervalDuration: 1000,
    };

    const candidates =
      this.settings.mimeTypeCandidates || [this.settings.mimeType].filter(Boolean);

    const tryCreateRecorder = (candidateList) => {
      let lastErr = null;
      for (const mt of candidateList) {
        try {
          if (MediaRecorder.isTypeSupported?.(mt) === false) continue;

          this._effectiveMimeType = mt;

          const rec = new MediaRecorder(combinedStream, {
            ...recorderOpts,
            mimeType: mt,
          });
          return { recorder: rec, lastErr: null };
        } catch (e) {
          lastErr = e;
        }
      }
      return { recorder: null, lastErr };
    };

    const created = tryCreateRecorder(candidates);

    if (created.recorder) {
      this.mRecorder = created.recorder;
    } else {
      this.mRecorder = new MediaRecorder(combinedStream, recorderOpts);
      this._effectiveMimeType = this.mRecorder.mimeType || this.settings.mimeType || '';
    }

    this._createStopPromise();

    this.mRecorder.ondataavailable = this._handleDataAvailable;
    this.mRecorder.onstop = this._handleStop;

    this.mRecorder.onerror = (e) => {
      const domErr = e?.error;
      const msg = String(domErr?.message || '').toLowerCase();
      const isEncodingInitFailure =
        domErr?.name === 'EncodingError' || msg.includes('encoder initialization failed');

      if (isEncodingInitFailure && !this._fallbackTried && this.chunks.length === 0) {
        this._fallbackTried = true;

        try {
          try {
            this.mRecorder.stop();
          } catch (_) {}

          const webmCandidates = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9,opus',
          ];

          const next = tryCreateRecorder(webmCandidates);

          if (next.recorder) {
            this.mRecorder = next.recorder;
          } else {
            this.mRecorder = new MediaRecorder(combinedStream, recorderOpts);
            this._effectiveMimeType = this.mRecorder.mimeType || this._effectiveMimeType;
          }

          this.mRecorder.ondataavailable = this._handleDataAvailable;
          this.mRecorder.onstop = this._handleStop;
          this.mRecorder.onerror = (err) =>
            console.error('MediaRecorder error:', err, err?.error, this.mRecorder?.mimeType);

          this.mRecorder.start(1000);
          return;
        } catch (fallbackErr) {
          console.error('MediaRecorder fallback failed:', fallbackErr, e);
        }
      }

      console.error('MediaRecorder error:', e, domErr, this.mRecorder?.mimeType);
    };

    try {
      this.mRecorder.start(1000);
    } catch (e) {
      const domErr = e?.error || e;
      const msg = String(domErr?.message || '').toLowerCase();
      const isEncodingInitFailure =
        domErr?.name === 'EncodingError' || msg.includes('encoder initialization failed');

      if (isEncodingInitFailure && !this._fallbackTried && this.chunks.length === 0) {
        this._fallbackTried = true;

        const webmCandidates = [
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9,opus',
        ];

        const next = tryCreateRecorder(webmCandidates);
        if (next.recorder) {
          this.mRecorder = next.recorder;
          this.mRecorder.ondataavailable = this._handleDataAvailable;
          this.mRecorder.onstop = this._handleStop;
          this.mRecorder.onerror = (err) =>
            console.error('MediaRecorder error:', err, err?.error, this.mRecorder?.mimeType);
          this.mRecorder.start(1000);
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }

    this.isRecording = true;
    this.trackDuration();
  }

  stop = async () => {
    if (!this.mRecorder) {
      this.isRecording = false;
      this.clearDurationInterval();
      return this._stopPromise || Promise.resolve();
    }

    const stopPromise = this._createStopPromise();

    try {
      try {
        this.mRecorder.requestData?.();
      } catch (e) {}
      this.mRecorder.stop();
    } catch (e) {
      console.warn('stop error:', e);
      try {
        this._stopResolve && this._stopResolve();
      } catch (e2) {}
    }

    this.isRecording = false;
    this.clearDurationInterval();

    return stopPromise;
  };

  async _getStream(type, streamId, useMicrophone = false, audioId) {
    const constraints = this.settings.constraints;

    this.videoStream = null;
    let microphoneStream = null;

    try {
      this.videoStream = await (type === 'tab'
        ? navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
              },
            },
            video: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId,
              },
            },
          })
        : navigator.mediaDevices.getDisplayMedia({
            ...constraints,
            video: {
              ...constraints.video,
              displaySurface: 'monitor',
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
      if (!useMicrophone && this.audioTrack) this.audioTrack.enabled = false;
    } catch (e) {
      console.error('get audio error', e);
      this.audioTrack = this.createPlaceholderAudioTrack();
    }

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      await this.audioCtx.resume();
    } catch (e) {}

    this.mixDest = this.audioCtx.createMediaStreamDestination();

    const existingAudioTracks = this.videoStream.getAudioTracks();
    if (existingAudioTracks.length > 0) {
      existingAudioTracks.forEach((track) => (track.enabled = true));
      const tabAudioStream = new MediaStream([existingAudioTracks[0]]);
      this.tabSource = this.audioCtx.createMediaStreamSource(tabAudioStream);
      this.tabSource.connect(this.mixDest);

      this.tabSource.connect(this.audioCtx.destination);
    }

    if (this.audioTrack) {
      const micStream = new MediaStream([this.audioTrack]);
      this.micSource = this.audioCtx.createMediaStreamSource(micStream);
      this.micSource.connect(this.mixDest);
    }

    const mixedTrack = this.mixDest.stream.getAudioTracks()[0];

    return new MediaStream([
      ...this.videoStream.getVideoTracks(),
      ...(mixedTrack ? [mixedTrack] : []),
    ]);
  }

  createPlaceholderAudioTrack = () => {
    try {
      // use dedicated ctx so we can close it on clearAll()
      this._placeholderAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this._placeholderAudioCtx.createOscillator();
      const gainNode = this._placeholderAudioCtx.createGain();
      const destination = this._placeholderAudioCtx.createMediaStreamDestination();

      oscillator.connect(gainNode);
      gainNode.connect(destination);
      gainNode.gain.value = 0; // silent
      oscillator.start();

      this._placeholderOsc = oscillator;
      return destination.stream.getAudioTracks()[0];
    } catch (e) {
      console.error('failed to create placeholder audio track', e);
      return null;
    }
  };

  _handleDataAvailable = (event) => {
    if (event?.data && event.data.size > 0) {
      this.chunks.push(event.data);
    }
  };

  recorded = false;

  _handleStop = async () => {
    try {
      const blob = new Blob(this.chunks, {
        type: this._effectiveMimeType || this.settings.mimeType,
      });

      const url = URL.createObjectURL(blob);

      this.videoBlob = blob;
      this.videoUrl = url;
      this.recorded = true;

      try {
        if (this.stream) {
          this.stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch (e) {}
          });
        }
      } catch (e) {}

      try {
        if (this.videoStream) {
          this.videoStream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch (e) {}
          });
        }
      } catch (e) {}

      try {
        if (this.audioTrack) {
          try {
            this.audioTrack.stop();
          } catch (e) {}
        }
      } catch (e) {}

      await this._cleanupAudioGraph();

      try {
        this._stopResolve && this._stopResolve();
      } catch (e) {}
    } catch (e) {
      console.error('onstop handler error:', e);
      try {
        this._stopReject && this._stopReject(e);
      } catch (e2) {}
    }
  };

  getVideoData = async () => {
    if (this.recorded && this.videoBlob) {
      return {
        blob: this.videoBlob,
        mtype: this._effectiveMimeType || this.settings.mimeType,
      };
    }
    if (this._stopPromise) {
      try {
        await this._stopPromise;
      } catch (e) {}
    }
    return {
      blob: this.videoBlob,
      mtype: this._effectiveMimeType || this.settings.mimeType,
    };
  };
}

const base64Alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let base64 = '';
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;

    const triple = (a << 16) | (b << 8) | c;

    base64 += base64Alphabet[(triple >> 18) & 0x3f];
    base64 += base64Alphabet[(triple >> 12) & 0x3f];
    base64 += i + 1 < len ? base64Alphabet[(triple >> 6) & 0x3f] : '=';
    base64 += i + 2 < len ? base64Alphabet[triple & 0x3f] : '=';
  }

  return base64;
};

const readBlobAsArrayBuffer = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsArrayBuffer(blob);
  });

const convertBlobToBase64Chunks = async (blob, maxChars = hardLimit) => {
  const maxRawBytes = Math.max(1, Math.floor(maxChars * 0.72));
  const totalBytes = blob.size;

  const parts = [];
  let offset = 0;

  while (offset < totalBytes) {
    const slice = blob.slice(offset, offset + maxRawBytes);
    const ab = await readBlobAsArrayBuffer(slice);
    const b64 = arrayBufferToBase64(ab);

    // safety: if for some reason it still exceeds, split further
    if (b64.length > maxChars) {
      const smaller = Math.max(1, Math.floor((maxRawBytes * maxChars) / b64.length));
      if (smaller >= maxRawBytes) {
        // should not happen, but avoid infinite loop
        throw new Error('Base64 chunk exceeds max size unexpectedly.');
      }
      offset = offset;
      const retrySlice = blob.slice(offset, offset + smaller);
      const retryAb = await readBlobAsArrayBuffer(retrySlice);
      const retryB64 = arrayBufferToBase64(retryAb);
      parts.push(retryB64);
      offset += smaller;
      continue;
    }

    parts.push(b64);
    offset += slice.size;
  }

  return { parts, bytes: totalBytes };
};

let recorder = new ScreenRecorder();
recorder.init(getRecordingSettings('720p'));

browser.runtime.onMessage.addListener((message, _, respond) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'offscr:start-recording') {
    recorder.clearAll();
    recorder
      .startRecording(message.area, message.data, message.microphone, message.audioId)
      .then(() => {
        respond({ success: true, time: Date.now() });
      })
      .catch((e) => {
        console.error(e);
        respond({ success: false, time: Date.now() });
      });
    return true;
  }

  if (message.type === 'offscr:get-ts') {
    respond({ time: recorder.duration });
    return true;
  }

  if (message.type === 'offscr:check-status') {
    respond({ status: recorder.isRecording, time: recorder.duration });
    return true;
  }

  if (message.type === 'offscr:stop-discard') {
    void recorder.stop().finally(() => recorder.clearAll());
    return true;
  }

  if (message.type === 'offscr:stop-recording') {
    void (async () => {
      try {
        await recorder.stop();
        const duration = recorder.duration;
        const data = await recorder.getVideoData();

        if (!data.blob || data.blob.size === 0) {
          console.error('No data recorded');
          respond({ status: 'empty' });
          recorder.clearAll();
          return;
        }

        const { parts } = await convertBlobToBase64Chunks(data.blob, hardLimit);

        if (parts.length > 1) {
          respond({ status: 'parts' });
          for (let i = 0; i < parts.length; i++) {
            void browser.runtime.sendMessage({
              type: 'offscr:video-data-chunk',
              data: parts[i],
              index: i,
              total: parts.length,
              duration,
              mtype: data.mtype,
            });
          }
        } else {
          respond({
            status: 'full',
            base64data: [parts[0]],
            duration,
            mtype: data.mtype,
          });
        }

        recorder.clearAll();
      } catch (e) {
        console.error('stop-recording failed:', e);
        respond({ status: 'error' });
        recorder.clearAll();
      }
    })();

    return true;
  }

  if (message.type === 'offscr:pause-recording') {
    recorder.pause();
    return 'paused';
  }

  if (message.type === 'offscr:resume-recording') {
    recorder.resume();
    return 'resumed';
  }

  if (message.type === 'offscr:mute-microphone') {
    recorder.muteMicrophone();
    return 'muted';
  }

  if (message.type === 'offscr:unmute-microphone') {
    recorder.unmuteMicrophone();
    return 'unmuted';
  }

  return 'miss';
});

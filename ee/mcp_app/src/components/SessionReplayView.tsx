import { useEffect, useRef, useState, useCallback } from 'react';
import ReplayEngine from '../player/ReplayEngine';
import type { PlaybackState } from '../player/ReplayEngine';
import { fetchAndParseMobFiles } from '../player/fetchAndParseMobFiles';

interface SessionReplayViewProps {
  fileUrls: string[];
  startTs: number;
  duration: number;
  sessionId: string;
  siteId: string;
  callServerTool: (req: { name: string; arguments: Record<string, unknown> }) => Promise<any>;
  app?: any;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// OpenReplay play icon SVG (from assets/integrations/openreplay.svg)
const OR_ICON_SVG = `<svg viewBox="0 0 52 59" xmlns="http://www.w3.org/2000/svg" width="52" height="59">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g fill-rule="nonzero">
      <path d="M44.2286654,29.5 L6.50039175,7.42000842 L6.50039175,51.5799916 L44.2286654,29.5 Z M49.3769757,24.9357962 C50.9991976,25.8727671 52,27.6142173 52,29.5 C52,31.3857827 50.9991976,33.1272329 49.3769757,34.0642038 L8.01498302,58.2754687 C4.63477932,60.2559134 0,57.9934848 0,53.7112649 L0,5.2887351 C0,1.00651517 4.63477932,-1.25591343 8.01498302,0.724531317 L49.3769757,24.9357962 Z" fill="#394EFF"/>
      <path d="M29.4155818,28.4568548 L14.7929806,20.1454193 C14.2168086,19.8179252 13.4842425,20.0195184 13.1567483,20.5956904 C13.0540138,20.7764349 13,20.9807697 13,21.188671 L13,37.8115419 C13,38.4742836 13.5372583,39.0115419 14.2,39.0115419 C14.4079013,39.0115419 14.6122361,38.9575281 14.7929806,38.8547936 L29.4155818,30.5433581 C29.9917538,30.215864 30.193347,29.4832978 29.8658528,28.9071259 C29.7590506,28.7192249 29.6034827,28.563657 29.4155818,28.4568548 Z" fill="#3EAAAF"/>
    </g>
  </g>
</svg>`;

export default function SessionReplayView({ fileUrls, startTs, duration, sessionId, siteId, callServerTool, app }: SessionReplayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReplayEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [urls, setUrls] = useState(fileUrls);
  const [currentStartTs, setCurrentStartTs] = useState(startTs);
  const [currentDuration, setCurrentDuration] = useState(duration);
  const [playback, setPlayback] = useState<PlaybackState>({
    time: 0,
    playing: false,
    completed: false,
    endTime: 0,
    ready: false,
    speed: 1,
    skipInactivity: false,
    skipIntervals: [],
  });
  const [speedOpen, setSpeedOpen] = useState(false);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [skipInterval, setSkipInterval] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleStateChange = useCallback((state: PlaybackState) => {
    setPlayback(state);
  }, []);

  const isExpiredError = error?.includes('403');

  // Re-request fresh signed URLs from the server and reload
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const result = await callServerTool({
        name: '_refresh_replay_urls',
        arguments: { sessionId, siteId },
      });
      const text = result?.content?.[0]?.text;
      if (!text || result.isError) {
        const errMsg = text ? JSON.parse(text).error : 'Failed to refresh replay URLs';
        setError(errMsg || 'Failed to refresh replay URLs');
        setRetrying(false);
        return;
      }
      const data = JSON.parse(text);
      // Reset state and trigger reload with fresh URLs
      setStarted(false);
      setError(null);
      setCurrentStartTs(data.startTs);
      setCurrentDuration(data.duration);
      setUrls(data.fileUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh replay URLs');
    } finally {
      setRetrying(false);
    }
  }, [callServerTool, sessionId]);

  // Fetch mob files and initialize engine
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const engine = new ReplayEngine({ onStateChange: handleStateChange });
    engineRef.current = engine;

    // CSS proxy — fetches external stylesheets via server to bypass sandbox CSP
    engine.setCssProxy(async (url: string) => {
      try {
        const result = await callServerTool({
          name: '_fetch_mob_file',
          arguments: { url },
        });
        const base64 = result?.content?.[0]?.text;
        if (!base64 || result.isError) return null;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      } catch {
        return null;
      }
    });

    engine.attach(containerRef.current);

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { messages, error: parseError } = await fetchAndParseMobFiles(urls, currentStartTs, callServerTool);

        if (cancelled) return;

        if (parseError || messages.length === 0) {
          setError(parseError || 'No messages parsed from recording');
          setLoading(false);
          return;
        }

        engine.loadMessages(messages, currentDuration);
        setLoading(false);

        // Apply first frame
        engine.jump(0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      engine.clean();
      engineRef.current = null;
    };
  }, [urls, currentStartTs, currentDuration, handleStateChange, callServerTool]);

  // Track playing state in a ref so the IntersectionObserver callback reads fresh values
  const playingRef = useRef(false);
  useEffect(() => { playingRef.current = playback.playing; }, [playback.playing]);

  // Pause playback when the view scrolls offscreen, resume when visible again
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const engine = engineRef.current;
        if (!engine) return;
        if (!entry.isIntersecting) {
          engine.pause();
        } else {
          // we can continue playing here;
        }
      });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleStartPlaying = () => {
    setStarted(true);
    engineRef.current?.play();
  };

  const handleTogglePlay = () => {
    engineRef.current?.togglePlay();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    engineRef.current?.jump(time);
  };

  const SKIP_INTERVALS = [2, 5, 10, 15, 20, 30, 60];

  const handleSkipBack = () => {
    engineRef.current?.jump(playback.time - skipInterval * 1000);
  };

  const handleSkipForward = () => {
    engineRef.current?.jump(playback.time + skipInterval * 1000);
  };

  const handleSelectInterval = (val: number) => {
    setSkipInterval(val);
    setIntervalOpen(false);
  };

  const SPEED_OPTIONS = [0.5, 1, 2, 4, 8, 16];

  const handleSetSpeed = (speed: number) => {
    engineRef.current?.setSpeed(speed);
    setSpeedOpen(false);
  };

  const handleToggleSkipInactivity = () => {
    engineRef.current?.toggleSkipInactivity();
  };

  const handleToggleFullscreen = async () => {
    if (!app) return;
    try {
      const newMode = isFullscreen ? 'inline' : 'fullscreen';
      const result = await app.requestDisplayMode({ mode: newMode });
      setIsFullscreen(result.mode === 'fullscreen');
    } catch {
      // Host may not support fullscreen
    }
  };

  const progress = playback.endTime > 0 ? (playback.time / playback.endTime) * 100 : 0;

  return (
    <div className="replay-container">
      <div className="replay-screen">
        <div ref={containerRef} className="replay-view" />
        {/* Click-to-start overlay */}
        {!started && !loading && !error && (
          <div className="replay-start-overlay" onClick={handleStartPlaying}>
            <div
              className="replay-start-icon"
              dangerouslySetInnerHTML={{ __html: OR_ICON_SVG }}
            />
            <span className="replay-start-text">Click to start playing</span>
          </div>
        )}
        {/* Click overlay to toggle play/pause */}
        {started && !error && (
          <div className="replay-click-guard" onClick={handleTogglePlay} />
        )}
        {loading && (
          <div className="replay-loading">
            <div className="replay-spinner" />
            <p>Loading session replay...</p>
          </div>
        )}
        {error && (
          <div className="replay-error">
            {isExpiredError ? (
              <>
                <p>Session recording URLs have expired</p>
                <button
                  className="replay-retry-btn"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? 'Refreshing...' : 'Reload replay'}
                </button>
              </>
            ) : (
              <p>Failed to load replay: {error}</p>
            )}
          </div>
        )}
      </div>
      <div className={`replay-controls${playback.playing ? ' is-playing' : ''}`}>
        {/* Timeline on top */}
        <div className="replay-progress-wrapper">
          <div className="replay-progress-track" />
          <div className="replay-progress-fill" style={{ width: `${progress}%` }} />
          {/* Skip interval indicators */}
          {playback.skipIntervals.map((si, i) => {
            const left = (si.start / playback.endTime) * 100;
            const width = ((si.end - si.start) / playback.endTime) * 100;
            return (
              <div
                key={i}
                className="replay-skip-interval"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}
          <input
            type="range"
            className="replay-progress"
            min={0}
            max={playback.endTime}
            value={playback.time}
            onChange={handleSeek}
            disabled={!playback.ready}
          />
        </div>

        {/* Buttons row */}
        <div className="replay-buttons">
          {/* Play/Pause */}
          <button
            className="replay-play-btn"
            onClick={handleTogglePlay}
            disabled={!playback.ready}
            title={playback.playing ? 'Pause' : 'Play'}
          >
            {playback.playing ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
              </svg>
            )}
          </button>

          {/* Timer */}
          <span className="replay-time">
            {formatTime(playback.time)}<span className="replay-time-sep">/</span>{formatTime(playback.endTime)}
          </span>

          {/* Skip back / interval / forward — mirrors frontend PlayerControls */}
          <div className="replay-skip-group">
            <button
              className="replay-skip-arrow replay-skip-arrow-left"
              onClick={handleSkipBack}
              disabled={!playback.ready}
              title={`Rewind ${skipInterval}s`}
            >
              <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor" style={{ transform: 'rotate(180deg)' }}>
                <path d="M825.8 498L538.4 249.9c-10.7-9.2-26.4-.9-26.4 14v496.3c0 14.9 15.7 23.2 26.4 14L825.8 526c8.3-7.2 8.3-20.8 0-28zm-320 0L218.4 249.9c-10.7-9.2-26.4-.9-26.4 14v496.3c0 14.9 15.7 23.2 26.4 14L505.8 526c4.1-3.6 6.2-8.8 6.2-14 0-5.2-2.1-10.4-6.2-14z" />
              </svg>
            </button>
            <div className="replay-interval-selector">
              <button
                className="replay-interval-btn"
                onClick={() => setIntervalOpen(!intervalOpen)}
                disabled={!playback.ready}
                title="Set default skip duration"
              >
                {skipInterval}s
              </button>
              {intervalOpen && (
                <div className="replay-interval-menu">
                  <div className="replay-interval-header">
                    Jump <span className="replay-interval-hint">(Secs)</span>
                  </div>
                  {SKIP_INTERVALS.map((val) => (
                    <button
                      key={val}
                      className={`replay-interval-option${val === skipInterval ? ' active' : ''}`}
                      onClick={() => handleSelectInterval(val)}
                    >
                      {val}<span className="replay-interval-hint">s</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="replay-skip-arrow replay-skip-arrow-right"
              onClick={handleSkipForward}
              disabled={!playback.ready}
              title={`Forward ${skipInterval}s`}
            >
              <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
                <path d="M825.8 498L538.4 249.9c-10.7-9.2-26.4-.9-26.4 14v496.3c0 14.9 15.7 23.2 26.4 14L825.8 526c8.3-7.2 8.3-20.8 0-28zm-320 0L218.4 249.9c-10.7-9.2-26.4-.9-26.4 14v496.3c0 14.9 15.7 23.2 26.4 14L505.8 526c4.1-3.6 6.2-8.8 6.2-14 0-5.2-2.1-10.4-6.2-14z" />
              </svg>
            </button>
          </div>

          {/* Speed selector */}
          <div className="replay-speed-wrapper">
            <button
              className="replay-ctrl-btn replay-speed-btn"
              onClick={() => setSpeedOpen(!speedOpen)}
              disabled={!playback.ready}
              title="Playback speed"
            >
              {playback.speed}x
            </button>
            {speedOpen && (
              <div className="replay-speed-menu">
                <div className="replay-speed-header">Playback speed</div>
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    className={`replay-speed-option${s === playback.speed ? ' active' : ''}`}
                    onClick={() => handleSetSpeed(s)}
                  >
                    {s}<span className="replay-interval-hint">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Skip inactivity toggle */}
          <button
            className={`replay-ctrl-btn replay-skip-inactivity-btn${playback.skipInactivity ? ' active' : ''}`}
            onClick={handleToggleSkipInactivity}
            disabled={!playback.ready}
            title="Skip Inactivity"
          >
            {playback.skipInactivity && (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            )}
            <span>Skip Inactivity</span>
          </button>

          {/* Fullscreen toggle — pushed to the right */}
          <button
            className="replay-ctrl-btn replay-fullscreen-btn"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 8 14 8 18" />
                <polyline points="20 10 16 10 16 6" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

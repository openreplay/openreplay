import { countries } from "../utils/countries";

interface Session {
  sessionId: string;
  replayUrl: string;
  userId?: string;
  userAnonymousId?: string;
  userUuid?: string;
  userBrowser?: string;
  userOs?: string;
  userCountry?: string;
  userDeviceType?: string;
  duration?: number;
  startTs?: number;
  eventsCount?: number;
  errorsCount?: number;
  metadata?: Record<string, any>;
}

interface SessionListProps {
  sessions: Session[];
  siteId: string;
}

const MAX_USER_NAME_LENGTH = 20;
const MAX_META_ITEMS = 2;
const MAX_META_LABEL_LENGTH = 12;
const MAX_META_VALUE_LENGTH = 16;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '...';
}

function SessionList({ sessions }: SessionListProps) {
  const formatDuration = (ms: number) => {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserName = (session: Session): string => {
    if (session.userId) return session.userId;
    if (session.userAnonymousId) return session.userAnonymousId;
    return 'Anonymous User';
  };

  const getInitials = (name: string): string => {
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[Math.abs(hash) % colors.length];
  };

  if (sessions.length === 0) {
    return (
      <div>
        <div className="view-header">
          <span className="view-title">Recent Sessions</span>
        </div>
        <div className="view-empty">
          <div className="view-empty-title">No sessions</div>
          <div className="view-empty-text">No sessions found for the selected criteria.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="view-header">
        <span className="view-title">Recent Sessions</span>
      </div>
      <div className="view-subtitle">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</div>

      <div className="session-list">
        {sessions.map((session) => {
          const userName = getUserName(session);
          const displayName = truncate(userName, MAX_USER_NAME_LENGTH);
          const initials = getInitials(userName);
          const avatarColor = getAvatarColor(userName);

          return (
            <div key={session.sessionId} className="session-item">
              <div className="session-item-main">
                {/* User column */}
                <div className="session-item-user">
                  <div className="session-avatar" style={{ backgroundColor: avatarColor }}>
                    {initials}
                  </div>
                  <div className="session-user-info">
                    <div
                      className="session-user-name"
                      title={userName.length > MAX_USER_NAME_LENGTH ? userName : undefined}
                    >
                      {displayName}
                    </div>
                    {session.metadata && Object.keys(session.metadata).length > 0 && (
                      <div className="session-meta-list">
                        {Object.entries(session.metadata).slice(0, MAX_META_ITEMS).map(([key, value]) => (
                          <div key={key} className="session-meta-tag" title={`${key}: ${value}`}>
                            <span className="session-meta-label">{truncate(key, MAX_META_LABEL_LENGTH)}</span>
                            <span className="session-meta-sep" />
                            <span className="session-meta-value">{truncate(String(value ?? 'null'), MAX_META_VALUE_LENGTH)}</span>
                          </div>
                        ))}
                        {Object.keys(session.metadata).length > MAX_META_ITEMS && (
                          <span className="session-meta-more">+{Object.keys(session.metadata).length - MAX_META_ITEMS}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Time & Events column */}
                <div className="session-item-time">
                  {session.startTs && (
                    <div className="session-item-timestamp">
                      {formatTime(session.startTs)}
                    </div>
                  )}
                  <div className="session-item-duration">
                    <span className="session-events">{session.eventsCount || 0} Event{session.eventsCount !== 1 ? 's' : ''}</span>
                    <span className="session-item-meta-dot" />
                    <span>{formatDuration(session.duration || 0)}</span>
                  </div>
                </div>

                {/* Location & Tech column */}
                <div className="session-item-tech">
                  <div className="session-country">
                    {session.userCountry && session.userCountry !== 'UN' ? countries[session.userCountry] : 'Unknown Country'}
                  </div>
                  <div className="session-item-meta">
                    {session.userBrowser && <span>{session.userBrowser}</span>}
                    {session.userBrowser && session.userOs && <span className="session-item-meta-dot" />}
                    {session.userOs && <span>{session.userOs}</span>}
                    {session.userOs && session.userDeviceType && <span className="session-item-meta-dot" />}
                    {session.userDeviceType && <span className="session-device">{session.userDeviceType}</span>}
                  </div>
                </div>
              </div>

              {/* Play button */}
              <div className="session-item-actions">
                <a
                  href={session.replayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="session-play-button"
                  title="Play session replay"
                >
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <path d="M0 0L12 7L0 14V0Z" fill="currentColor"/>
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SessionList;

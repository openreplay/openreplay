import { useState } from 'react';

interface AuthOverlayProps {
  authError: string | null;
  jwt: string;
  setJwt: (jwt: string) => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBrowserLogin: (backendUrl: string) => Promise<void>;
}

function AuthOverlay({
  authError,
  jwt,
  setJwt,
  backendUrl,
  setBackendUrl,
  onSubmit,
  onBrowserLogin,
}: AuthOverlayProps) {
  const [browserLoginPending, setBrowserLoginPending] = useState(false);
  const [showJwtForm, setShowJwtForm] = useState(false);

  const handleBrowserLogin = async () => {
    setBrowserLoginPending(true);
    try {
      await onBrowserLogin(backendUrl);
    } finally {
      setBrowserLoginPending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--color-background, white)',
          padding: '32px',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: 600 }}>
          Authentication Required
        </h2>

        {authError && (
          <div className="error-message" style={{ marginBottom: '16px' }}>
            {authError}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="backendUrl">OpenReplay API URL</label>
          <input
            id="backendUrl"
            type="url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://api.openreplay.com"
            required
            style={{ width: '100%' }}
          />
        </div>

        <button
          type="button"
          className="play-button"
          style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
          disabled={browserLoginPending}
          onClick={handleBrowserLogin}
        >
          {browserLoginPending ? 'Waiting for approval...' : 'Login with Browser'}
        </button>

        {browserLoginPending && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', textAlign: 'center', marginBottom: '12px' }}>
            A browser tab should open. Log in and approve access, then return here.
          </p>
        )}

        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setShowJwtForm(!showJwtForm)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--or-teal, #394EFF)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'underline',
            }}
          >
            {showJwtForm ? 'Hide JWT login' : 'Or paste a JWT token manually'}
          </button>
        </div>

        {showJwtForm && (
          <form onSubmit={onSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="jwt">JWT Token</label>
              <textarea
                id="jwt"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="Paste your JWT token here..."
                required
                rows={4}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.875rem',
                }}
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '4px' }}>
                To get your JWT: Login to OpenReplay in browser → Open DevTools → Network tab → Copy token from Authorization header
              </p>
            </div>

            <button type="submit" className="play-button" style={{ width: '100%', justifyContent: 'center' }}>
              Login with JWT
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthOverlay;

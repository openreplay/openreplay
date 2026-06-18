import { useState } from 'react';

interface AuthOverlayProps {
  authError: string | null;
  appUrl: string;
  setAppUrl: (url: string) => void;
  onBrowserLogin: (appUrl: string) => Promise<void>;
}

function AuthOverlay({
  authError,
  appUrl,
  setAppUrl,
  onBrowserLogin,
}: AuthOverlayProps) {
  const [browserLoginPending, setBrowserLoginPending] = useState(false);

  const handleBrowserLogin = async () => {
    setBrowserLoginPending(true);
    try {
      await onBrowserLogin(appUrl);
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
          Sign in to OpenReplay
        </h2>

        <p style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)' }}>
          Log in through your browser to connect this app to your OpenReplay account.
        </p>

        {authError && (
          <div className="error-message" style={{ marginBottom: '16px' }}>
            {authError}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="appUrl">OpenReplay URL</label>
          <input
            id="appUrl"
            type="url"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://app.openreplay.com"
            required
            style={{ width: '100%' }}
          />
        </div>

        <button
          type="button"
          className="play-button"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={browserLoginPending}
          onClick={handleBrowserLogin}
        >
          {browserLoginPending ? 'Waiting for approval...' : 'Login with Browser'}
        </button>

        {browserLoginPending && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', textAlign: 'center', marginTop: '12px' }}>
            A browser tab should open. Log in and approve access, then return here.
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthOverlay;

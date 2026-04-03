import React, { useState } from 'react';

interface ConfigPanelProps {
  authenticated: boolean;
  backendUrl: string;
  onLogin: (jwt: string) => Promise<void>;
  onConfigureBackend: (backendUrl: string) => Promise<void>;
  onFetchChartData: (endpoint: string, params?: Record<string, any>) => Promise<void>;
}

function ConfigPanel({
  authenticated,
  backendUrl,
  onLogin,
  onConfigureBackend,
  onFetchChartData,
}: ConfigPanelProps) {
  const [jwt, setJwt] = useState('');
  const [newBackendUrl, setNewBackendUrl] = useState(backendUrl);
  const [endpoint, setEndpoint] = useState('/api/v1/dashboard/chart');
  const [siteId, setSiteId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await onLogin(jwt);
      setSuccess('Successfully logged in!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureBackend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await onConfigureBackend(newBackendUrl);
      setSuccess('Backend URL updated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const params = siteId ? { siteId } : undefined;
      await onFetchChartData(endpoint, params);
      setSuccess('Chart data fetched successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>
        Configuration
      </h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Backend Configuration */}
      <div className="config-panel" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>
          Backend Configuration
        </h3>
        <form onSubmit={handleConfigureBackend}>
          <div className="form-group">
            <label htmlFor="backendUrl">OpenReplay API URL</label>
            <input
              id="backendUrl"
              type="url"
              value={newBackendUrl}
              onChange={(e) => setNewBackendUrl(e.target.value)}
              placeholder="https://api.openreplay.com"
              required
            />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '4px' }}>
              For self-hosted: use your OpenReplay API URL (e.g., https://api.your-domain.com)
            </p>
          </div>
          <button
            type="submit"
            className="button button-primary"
            disabled={loading || newBackendUrl === backendUrl}
          >
            {loading ? 'Updating...' : 'Update Backend URL'}
          </button>
        </form>
      </div>

      {/* Authentication */}
      {!authenticated && (
        <div className="config-panel" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>
            Login to OpenReplay
          </h3>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="jwt">JWT Token</label>
              <textarea
                id="jwt"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="Paste your JWT token here..."
                required
                rows={4}
                style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.875rem' }}
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '4px' }}>
                💡 To get your JWT: Login to OpenReplay in browser → Open DevTools → Network tab → Copy token from any API request header
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '4px' }}>
                🔒 Your token is saved locally and will persist across sessions
              </p>
            </div>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login with JWT'}
            </button>
          </form>
        </div>
      )}

      {/* Data Fetching */}
      {authenticated && (
        <div className="config-panel">
          <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>
            Fetch Chart Data
          </h3>
          <form onSubmit={handleFetchData}>
            <div className="form-group">
              <label htmlFor="siteId">Site ID (Project ID)</label>
              <input
                id="siteId"
                type="text"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="123"
              />
            </div>
            <div className="form-group">
              <label htmlFor="endpoint">API Endpoint</label>
              <input
                id="endpoint"
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/v1/dashboard/chart"
                required
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)', marginTop: '4px' }}>
                Example endpoints: /api/v1/dashboard/chart, /api/v1/sessions/stats
              </p>
            </div>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Fetching...' : 'Fetch Data'}
            </button>
          </form>
        </div>
      )}

      {authenticated && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-background-secondary, #f9fafb)', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #6b7280)' }}>
            ✓ Authenticated - You can now fetch chart data and view session replays
          </p>
        </div>
      )}
    </div>
  );
}

export default ConfigPanel;

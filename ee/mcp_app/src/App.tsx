import { useState, useMemo, useCallback } from 'react';
import { useApp, useHostStyles, useAutoResize, useHostStyleVariables } from '@modelcontextprotocol/ext-apps/react';
import ChartView from './components/ChartView';
import SessionList from './components/SessionList';
import SankeyView from './components/SankeyView';
import WebVitalsView from './components/WebVitalsView';
import TableChartView from './components/TableChartView';
import FunnelView from './components/FunnelView';
import SessionReplayView from './components/SessionReplayView';
import AuthOverlay from './components/AuthOverlay';
import IdleView from './components/IdleView';
import { useOpenReplayApp } from './hooks/useOpenReplayApp';
import { createDebugger } from './utils/debugger';

function App() {
  const { state, setState, handleToolResult } = useOpenReplayApp();
  const [appReady, setAppReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwt, setJwt] = useState('');
  const [backendUrl, setBackendUrl] = useState('https://api.openreplay.com');

  const { app, isConnected, error: appError } = useApp({
    appInfo: {
      name: 'OpenReplay Viewer',
      version: '1.0.0',
    },
    capabilities: {},
    onAppCreated: async (createdApp) => {
      try {
        const debugLogger = createDebugger(createdApp);
        await debugLogger.info('OpenReplay MCP App initialized');

        createdApp.ontoolinput = async () => {
          // Tool input received - can be used for loading states
        };

        createdApp.ontoolresult = async (result: any) => {
          try {
            await handleToolResult(result, createdApp);
            await debugLogger.info('Tool result processed successfully');
          } catch (err) {
            await debugLogger.error(`Tool result processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            throw err;
          }
        };

        createdApp.onhostcontextchanged = () => {
          // Reserved for future host context handling
        };

        createdApp.onteardown = async () => {
          return {};
        };

        setAppReady(true);
      } catch (err) {
        console.error('Error initializing app:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setAppReady(false);
      }
    },
  });

  // Create debugger for logging to host
  const logger = useMemo(() => createDebugger(app), [app]);

  // Stable reference to callServerTool for child components
  const callServerTool = useCallback(
    (req: { name: string; arguments: Record<string, unknown> }) => {
      if (!app) throw new Error('App not initialized');
      return app.callServerTool(req);
    },
    [app],
  );

  // Apply host styles and theme
  useHostStyles(app);
  useHostStyleVariables(app);
  useAutoResize(app);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!app) throw new Error('App not initialized');

      await logger.info('Attempting login...');

      // Update backend URL
      await app.callServerTool({
        name: 'configure_backend',
        arguments: { backendUrl },
      });

      // Login with JWT
      await app.callServerTool({
        name: 'login_jwt',
        arguments: { jwt },
      });

      await logger.info('Login successful');

      // Close the overlay
      setState(prev => ({
        ...prev,
        showAuthOverlay: false,
        authError: null,
      }));

      // Retry the last failed request if there was one
      if (state.lastFailedRequest) {
        await state.lastFailedRequest();
        setState(prev => ({ ...prev, lastFailedRequest: null }));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      await logger.error(`Login failed: ${errorMsg}`);
      setState(prev => ({
        ...prev,
        authError: errorMsg,
      }));
    }
  };

  // Error state
  if (error || appError) {
    return (
      <div className="app-container">
        <div className="content">
          <div className="error-message">
            <strong>Error:</strong> {error || appError?.message || 'An unknown error occurred'}
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (!isConnected) {
    return (
      <div className="app-container">
        <div className="content">
          <div className="loading">
            <p>Connecting...</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!appReady) {
    return (
      <div className="app-container">
        <div className="content">
          <div className="loading">
            <p>Initializing OpenReplay MCP App...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {state.showAuthOverlay && (
        <AuthOverlay
          authError={state.authError}
          jwt={jwt}
          setJwt={setJwt}
          backendUrl={backendUrl}
          setBackendUrl={setBackendUrl}
          onSubmit={handleLogin}
        />
      )}

      <div className="content">
        {state.currentView === 'idle' && <IdleView />}

        {state.currentView === 'session_list' && state.sessionListData && (
          <SessionList
            sessions={state.sessionListData.sessions}
            siteId={state.sessionListData.siteId}
          />
        )}

        {state.currentView === 'chart' && state.chartData && (
          <ChartView data={state.chartData} />
        )}

        {state.currentView === 'sankey' && state.sankeyData && (
          <SankeyView data={state.sankeyData} />
        )}

        {state.currentView === 'web_vitals' && state.webVitalsData && (
          <WebVitalsView data={state.webVitalsData} />
        )}

        {state.currentView === 'table_chart' && state.tableChartData && (
          <TableChartView data={state.tableChartData} />
        )}

        {state.currentView === 'funnel' && state.funnelData && (
          <FunnelView data={state.funnelData} />
        )}

        {state.currentView === 'session_replay' && state.replayData && (
          <SessionReplayView
            fileUrls={state.replayData.fileUrls}
            startTs={state.replayData.startTs}
            duration={state.replayData.duration}
            sessionId={state.replayData.sessionId}
            siteId={state.replayData.siteId}
            callServerTool={callServerTool}
            app={app}
          />
        )}
      </div>
    </div>
  );
}

export default App;

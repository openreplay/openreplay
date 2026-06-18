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
  const [appUrl, setAppUrl] = useState('https://app.openreplay.com');

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

  // App-initiated tool calls don't fire `ontoolresult` (that's only for
  // host-driven calls), so feed the result through handleToolResult ourselves
  // — otherwise the UI never switches views after the tool resolves.
  const callServerToolAndApply = useCallback(
    async (req: { name: string; arguments: Record<string, unknown> }) => {
      if (!app) throw new Error('App not initialized');
      const result = await app.callServerTool(req);
      await handleToolResult(result, app);
      return result;
    },
    [app, handleToolResult],
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

      // Update OpenReplay URL
      await app.callServerTool({
        name: 'configure_backend',
        arguments: { appUrl },
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

  const parseToolResult = (result: any): any => {
    const firstContent = result?.content?.[0];
    if (firstContent && 'text' in firstContent) {
      try {
        return JSON.parse(firstContent.text);
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleBrowserLogin = async (browserAppUrl: string) => {
    try {
      if (!app) throw new Error('App not initialized');

      await logger.info('Starting browser login...');

      await app.callServerTool({
        name: 'configure_backend',
        arguments: { appUrl: browserAppUrl },
      });

      // Step 1 — start the flow. login_browser opens the browser and returns immediately.
      const startResult = await app.callServerTool({
        name: 'login_browser',
        arguments: { appUrl: browserAppUrl },
      });

      const startData = parseToolResult(startResult);
      if (!startData || startData.type === 'error') {
        throw new Error(startData?.error || 'login_browser did not return a valid response');
      }

      await logger.info(`Browser opened. Polling for approval...`);

      // Step 2 — poll complete_login. Each call waits up to 60s on the server.
      // Loop here in case the user is slow to confirm; pollForAuth is short-lived
      // so we re-issue rather than blocking for 5 minutes inside one tool call.
      const overallDeadline = Date.now() + 5 * 60_000;
      while (Date.now() < overallDeadline) {
        const completeResult = await app.callServerTool({
          name: 'complete_login',
          arguments: { state: startData.state },
        });

        const completeData = parseToolResult(completeResult);
        if (completeData?.type === 'auth_success') {
          await logger.info('Browser login successful');

          setState(prev => ({
            ...prev,
            showAuthOverlay: false,
            authError: null,
          }));

          if (state.lastFailedRequest) {
            await state.lastFailedRequest();
            setState(prev => ({ ...prev, lastFailedRequest: null }));
          }
          return;
        }

        if (completeData?.type === 'error') {
          throw new Error(completeData.error);
        }
        // auth_pending — loop and poll again
      }

      throw new Error('Browser login timed out after 5 minutes');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Browser login failed';
      await logger.error(`Browser login failed: ${errorMsg}`);
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
          appUrl={appUrl}
          setAppUrl={setAppUrl}
          onSubmit={handleLogin}
          onBrowserLogin={handleBrowserLogin}
        />
      )}

      <div className="content">
        {state.currentView === 'idle' && <IdleView />}

        {state.currentView === 'session_list' && state.sessionListData && (
          <SessionList
            sessions={state.sessionListData.sessions}
            siteId={state.sessionListData.siteId}
            callServerTool={callServerToolAndApply}
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
            onBack={
              state.sessionListData
                ? () => setState(prev => ({ ...prev, currentView: 'session_list' }))
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

export default App;

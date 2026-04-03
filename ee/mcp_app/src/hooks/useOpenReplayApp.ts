import { useState } from 'react';
import { App } from '@modelcontextprotocol/ext-apps/react';

interface AppState {
  currentView: 'session_list' | 'chart' | 'sankey' | 'web_vitals' | 'table_chart' | 'funnel' | 'session_replay' | 'idle';
  sessionListData: {
    sessions: any[];
    siteId: string;
  } | null;
  chartData: any | null;
  sankeyData: any | null;
  webVitalsData: any | null;
  tableChartData: any | null;
  funnelData: any | null;
  replayData: {
    fileUrls: string[];
    startTs: number;
    duration: number;
    sessionId: string;
    siteId: string;
  } | null;
  showAuthOverlay: boolean;
  authError: string | null;
  lastFailedRequest: (() => Promise<void>) | null;
}

export function useOpenReplayApp() {
  const [state, setState] = useState<AppState>({
    currentView: 'idle',
    sessionListData: null,
    chartData: null,
    sankeyData: null,
    webVitalsData: null,
    tableChartData: null,
    funnelData: null,
    replayData: null,
    showAuthOverlay: false,
    authError: null,
    lastFailedRequest: null,
  });

  const handleToolResult = async (result: any, app: App) => {
    try {
      if (result.content?.[0]?.type === 'text') {
        const data = JSON.parse(result.content[0].text);

        // Handle auth errors
        if (data.type === 'error' && data.isAuthError) {
          setState(prev => ({
            ...prev,
            showAuthOverlay: true,
            authError: data.error,
          }));
          return;
        }

        // Handle session list data
        if (data.type === 'session_list') {
          setState(prev => ({
            ...prev,
            currentView: 'session_list',
            sessionListData: {
              sessions: data.sessions,
              siteId: data.siteId,
            },
            showAuthOverlay: false,
            authError: null,
          }));

          // Update model context
          if (app.updateModelContext) {
            const sessionSummary = data.sessions.map((s: any) =>
              `- Session ${s.sessionId.slice(0, 8)}... by ${s.userId || s.userAnonymousId || 'Anonymous'} (${s.eventsCount || 0} events)`
            ).join('\n');

            await app.updateModelContext({
              content: [{
                type: 'text',
                text: `Loaded ${data.sessions.length} recent sessions from site ${data.siteId}:\n${sessionSummary}`
              }]
            });
          }
        }

        // Handle chart data
        if (data.type === 'chart') {
          setState(prev => ({
            ...prev,
            currentView: 'chart',
            chartData: data,
            showAuthOverlay: false,
            authError: null,
          }));
        }

        // Handle user journey (sankey) data
        if (data.type === 'user_journey') {
          setState(prev => ({
            ...prev,
            currentView: 'sankey',
            sankeyData: data,
            showAuthOverlay: false,
            authError: null,
          }));
        }

        // Handle web vitals data
        if (data.type === 'web_vitals') {
          setState(prev => ({
            ...prev,
            currentView: 'web_vitals',
            webVitalsData: data,
            showAuthOverlay: false,
            authError: null,
          }));
        }

        // Handle table chart data (top pages, browsers, countries, etc.)
        if (data.type === 'table_chart') {
          setState(prev => ({
            ...prev,
            currentView: 'table_chart',
            tableChartData: data,
            showAuthOverlay: false,
            authError: null,
          }));
        }

        // Handle funnel data
        if (data.type === 'funnel') {
          setState(prev => ({
            ...prev,
            currentView: 'funnel',
            funnelData: data,
            showAuthOverlay: false,
            authError: null,
          }));
        }

        // Handle session replay — pass mob file URLs to UI for direct fetch+parse
        if (data.type === 'session_replay') {
          setState(prev => ({
            ...prev,
            currentView: 'session_replay',
            replayData: {
              fileUrls: data.fileUrls,
              startTs: data.startTs,
              duration: data.duration,
              sessionId: data.sessionId,
              siteId: data.siteId,
            },
            showAuthOverlay: false,
            authError: null,
          }));

          if (app.updateModelContext) {
            await app.updateModelContext({
              content: [{
                type: 'text',
                text: `Showing session replay for ${data.sessionId} (${Math.round(data.duration / 1000)}s duration)`
              }]
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse tool result:', err);
      throw err;
    }
  };

  return {
    state,
    setState,
    handleToolResult,
  };
}

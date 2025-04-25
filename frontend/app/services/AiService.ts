import BaseService from 'App/services/BaseService';

export default class AiService extends BaseService {
  /**
   * @returns stream of text symbols
   * */
  async getSummary(
    sessionId: string,
    start?: number,
    end?: number,
  ): Promise<string | null> {
    const r = await this.client.post(
      `/sessions/${sessionId}/intelligent/summary`,
      {
        frameStartTimestamp: start,
        frameEndTimestamp: end,
      },
    );

    return r.json();
  }

  async getDetailedSummary(
    sessionId: string,
    networkEvents: any[],
    feat: 'errors' | 'issues' | 'journey',
    start: number,
    end: number,
  ): Promise<string | null> {
    const r = await this.client.post(
      `/sessions/${sessionId}/intelligent/detailed-summary`,
      {
        event: feat,
        frameStartTimestamp: start,
        frameEndTimestamp: end,
        devtoolsEvents: networkEvents,
      },
    );

    return r.json();
  }

  async getSearchFilters(query: string): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/search', {
      question: query,
    });
    const { data } = await r.json();
    return data;
  }

  async getCardFilters(
    query: string,
    chartType?: string,
  ): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/search-plus', {
      question: query,
      chartType,
    });
    const { data } = await r.json();
    return data;
  }

  async omniSearch(
    query: string,
    filters: Record<any, any>,
  ): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/ask-or/charts', {
      ...filters,
      question: query,
      metricType: 'omnisearch',
    });
    const { data } = await r.json();
    return data;
  }

  async getCardData(
    query: string,
    chartData: Record<string, any>,
  ): Promise<Record<string, any>> {
    const r = await this.client.post('/intelligent/ask-or/charts', {
      ...chartData,
      question: query,
    });
    const { data } = await r.json();
    return data;
  }

  getKaiChats = async (userId: string, projectId: string): Promise<{ title: string, threadId: string }[]> => {
    // const r = await this.client.get('/kai/PROJECT_ID/chats');
    const jwt = window.env.KAI_TESTING // this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chats?user_id=${userId}`, {
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }),
    });
    if (!r.ok) {
      throw new Error('Failed to fetch chats');
    }
    const data = await r.json();
    return data;
  }

  deleteKaiChat = async (projectId: string, userId: string, threadId: string): Promise<boolean> => {
    const jwt = window.env.KAI_TESTING // this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chats/${threadId}?user_id=${userId}`, {
      method: 'DELETE',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }),
    });
    if (!r.ok) {
      throw new Error('Failed to delete chat');
    }
    return true;
  }

  getKaiChat = async (projectId: string, userId: string, threadId: string): Promise<{ role: string, content: string, message_id: any }[]> => {
    const jwt = window.env.KAI_TESTING // this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chats/${threadId}?user_id=${userId}`, {
      method: 'GET',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }),
    });
    if (!r.ok) {
      throw new Error('Failed to fetch chat');
    }
    const data = await r.json();
    return data;
  }

  createKaiChat = async (projectId: string, userId: string): Promise<number> => {
    const jwt = window.env.KAI_TESTING // this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chat/new?user_id=${userId}`, {
      method: 'GET',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }),
    })
    if (!r.ok) {
      throw new Error('Failed to create chat');
    }
    const data = await r.json();
    return data;
  }

  feedback = async (positive: boolean | null, messageId: string, projectId: string, userId: string) => {
    const jwt = window.env.KAI_TESTING // this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/messages/feedback`, {
      method: 'POST',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }),
      body: JSON.stringify({
        message_id: messageId,
        value: positive,
        user_id: userId,
      }),
    });
    if (!r.ok) {
      throw new Error('Failed to send feedback');
    }

    return await r.json()
  }
}

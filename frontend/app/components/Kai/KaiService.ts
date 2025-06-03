import AiService from '@/services/AiService';

export default class KaiService extends AiService {
  getKaiChats = async (
    projectId: string,
  ): Promise<{ title: string; thread_id: string; datetime: string }[]> => {
    const r = await this.client.get(`/kai/${projectId}/chats`);
    if (!r.ok) {
      throw new Error('Failed to fetch chats');
    }
    const data = await r.json();
    return data;
  };

  deleteKaiChat = async (
    projectId: string,
    threadId: string,
  ): Promise<boolean> => {
    const r = await this.client.delete(`/kai/${projectId}/chats/${threadId}`);
    if (!r.ok) {
      throw new Error('Failed to delete chat');
    }
    return true;
  };

  getKaiChat = async (
    projectId: string,
    threadId: string,
  ): Promise<{
    messages: {
      role: string;
      content: string;
      message_id: any;
      duration: number;
      feedback: boolean | null;
      supports_visualization: boolean;
      chart: string;
      chart_data: string;
      sessions?: Record<string, any>[];
    }[];
    title: string;
  }> => {
    const r = await this.client.get(`/kai/${projectId}/chats/${threadId}`);
    if (!r.ok) {
      throw new Error('Failed to fetch chat');
    }
    const data = await r.json();
    return data;
  };

  createKaiChat = async (projectId: string): Promise<number> => {
    const r = await this.client.get(`/kai/${projectId}/chat/new`);
    if (!r.ok) {
      throw new Error('Failed to create chat');
    }
    const data = await r.json();
    return data;
  };

  feedback = async (
    positive: boolean | null,
    messageId: string,
    projectId: string,
  ) => {
    const r = await this.client.post(`/kai/${projectId}/messages/feedback`, {
      message_id: messageId,
      value: positive,
    });
    if (!r.ok) {
      throw new Error('Failed to send feedback');
    }

    return await r.json();
  };

  cancelGeneration = async (projectId: string, threadId: string) => {
    const r = await this.client.post(`/kai/${projectId}/cancel/${threadId}`);
    if (!r.ok) {
      throw new Error('Failed to cancel generation');
    }

    const data = await r.json();
    return data;
  };

  getMsgChart = async (
    messageId: string,
    projectId: string,
  ): Promise<string> => {
    const r = await this.client.get(
      `/kai/${projectId}/chats/data/${messageId}`,
    );
    if (!r.ok) {
      throw new Error('Failed to fetch chart data');
    }
    const data = await r.json();
    return data;
  };

  saveChartData = async (
    messageId: string,
    projectId: string,
    chartData: any,
  ) => {
    const r = await this.client.post(
      `/kai/${projectId}/chats/data/${messageId}`,
      {
        chart_data: JSON.stringify(chartData),
      },
    );
    if (!r.ok) {
      throw new Error('Failed to save chart data');
    }

    const data = await r.json();
    return data;
  };

  checkUsage = async (): Promise<{ total: number; used: number }> => {
    const r = await this.client.get(`/kai/usage`);
    if (!r.ok) {
      throw new Error('Failed to fetch usage');
    }
    const data = await r.json();
    return data;
  };

  getPromptSuggestions = async (
    projectId: string,
    threadId?: string | null,
  ): Promise<string[]> => {
    const endpoint = threadId
      ? `/kai/${projectId}/chats/${threadId}/prompt-suggestions`
      : `/kai/${projectId}/prompt-suggestions`;
    const r = await this.client.get(endpoint);
    if (!r.ok) {
      throw new Error('Failed to fetch prompt suggestions');
    }
    const data = await r.json();
    return data;
  };
}

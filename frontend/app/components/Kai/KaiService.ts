import AiService from '@/services/AiService';

export default class KaiService extends AiService {
  getKaiChats = async (
    projectId: string,
  ): Promise<{ title: string; thread_id: string }[]> => {
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
  ): Promise<
    {
      role: string;
      content: string;
      message_id: any;
      duration?: number;
      feedback: boolean | null;
    }[]
  > => {
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
}

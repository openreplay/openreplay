import AiService from "@/services/AiService";

export default class KaiService extends AiService {
  getKaiChats = async (userId: string, projectId: string): Promise<{ title: string, threadId: string }[]> => {
    // const r = await this.client.get('/kai/PROJECT_ID/chats');
    const jwt = this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chats`, {
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
    const jwt = this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chats/${threadId}`, {
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

  getKaiChat = async (projectId: string, userId: string, threadId: string): Promise<{ role: string, content: string, message_id: any, duration?: number }[]> => {
    const jwt = this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chats/${threadId}`, {
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
    const jwt = this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/chat/new`, {
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
    const jwt = this.client.getJwt()
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

  cancelGeneration = async (projectId: string, threadId: string, userId: string) => {
    const jwt = this.client.getJwt()
    const r = await fetch(`http://localhost:8700/kai/${projectId}/cancel/${threadId}`, {
      method: 'POST',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }),
    });
    if (!r.ok) {
      throw new Error('Failed to cancel generation');
    }

    const data = await r.json();
    return data;
  }
}

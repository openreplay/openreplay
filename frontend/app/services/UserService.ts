import APIClient from 'App/api_client';
import User from 'App/mstore/types/user';

export default class UserService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  all() {
    return this.client
      .get('/client/members')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || []);
  }

  one(userId: string) {
    return this.client
      .get(`/users/${userId}`)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  save(user: User): Promise<any> {
    const data = user.toSave();
    if (user.userId) {
      return this.client
        .put(`/client/members/${user.userId}`, data)
        .then((r) => r.json())
        .then((response: { data: any }) => response.data || {})
        .catch((e) => Promise.reject(e));
    }
    return this.client
      .post('/client/members', data)
      .then((r) => r.json())
      .then((response: { data: any }) => response.data || {})
      .catch((e) => Promise.reject(e));
  }

  generateInviteCode(userId: any): Promise<any> {
    return this.client
      .get(`/client/members/${userId}/reset`)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  delete(userId: string) {
    return this.client
      .delete(`/client/members/${userId}`)
      .then((r) => r.json())
      .then((response: { data: any }) => response.data || {})
      .catch((e) => Promise.reject(e));
  }

  getRoles() {
    return this.client
      .get('/client/roles')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || []);
  }

  createRole(role: any) {
    return this.client.post('/client/roles', role).then((r) => r.json());
  }

  modifyRole(role: any) {
    return this.client
      .put(`/client/roles/${role.roleId}`, role)
      .then((r) => r.json());
  }

  deleteRole(roleId: string) {
    return this.client.delete(`/client/roles/${roleId}`).then((r) => r.json());
  }

  getLimits() {
    return this.client
      .get('/limits')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  getNotificationsCount() {
    return this.client
      .get('/notifications/count')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  getNotifications() {
    return this.client
      .get('/notifications')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  ignoreNotification(notificationId: number) {
    return this.client
      .get(`/notifications/${notificationId}/view`)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  ignoreAllNotifications(params: any) {
    return this.client
      .post('/notifications/view', params)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  saveModules(module: any) {
    return this.client
      .post('/users/modules', module)
      .then((r) => r.json())
      .then((response: { data: any }) => response.data || {})
      .catch((e) => Promise.reject(e));
  }

  login(data: any) {
    return this.client
      .post('/login', data)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  signup(data: any) {
    return this.client
      .post('/signup', data)
      .then((response: { json: () => any }) => response.json())
      .then(
        (response: { data: any }) => (response as Record<string, any>) || {},
      );
  }

  async resetPassword(data: any) {
    const response = await this.client.post('/password/reset', data);
    const responseData = await response.json();
    return responseData || {};
  }

  async requestResetPassword(data: any) {
    const response = await this.client.post('/password/reset-link', data);
    const responseData = await response.json();
    return responseData.data || {};
  }

  updatePassword = async (data: any) => {
    try {
      const response = await this.client.post('/account/password', data);
      const responseData = await response.json();
      if (responseData.errors) {
        throw new Error(
          responseData.errors[0] || 'An unexpected error occurred.',
        );
      }

      return responseData || {};
    } catch (error: any) {
      if (error.response) {
        const errorData = await error.response.json();
        const errorMessage = errorData.errors
          ? errorData.errors[0]
          : 'An unexpected error occurred.';
        throw new Error(errorMessage);
      }
      throw new Error('An unexpected error occurred.');
    }
  };

  fetchTenants() {
    return this.client
      .get('/signup')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || []);
  }

  fetchUserInfo() {
    return this.client
      .get('/account')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  logout() {
    return this.client
      .get('/logout')
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  updateClient(data: any) {
    return this.client
      .post('/account', data)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  updateAccount(data: any) {
    return this.updateClient(data);
  }

  resendEmailVerification(data: any) {
    return this.client
      .post('/re-validate', data)
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }

  changeScope(scope: 1 | 2) {
    return this.client
      .post('/account/scope', { scope })
      .then((response: { json: () => any }) => response.json())
      .then((response: { data: any }) => response.data || {});
  }
}

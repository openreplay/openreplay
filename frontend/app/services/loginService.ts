import BaseService from './BaseService';

export default class LoginService extends BaseService {
  public async login({
    email,
    password,
    captchaResponse,
  }: {
    email: string;
    password: string;
    captchaResponse?: string;
  }) {
    const response = await this.client.post('/login', {
      email: email.trim(),
      password,
      'g-recaptcha-response': captchaResponse,
    });

    const responseData = await response.json();

    // if (responseData.errors) {
    //   throw new Error(responseData.errors[0] || 'An unexpected error occurred.');
    // }

    return responseData || {};
  }
}

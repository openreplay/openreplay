import BaseService from "./BaseService";

export default class LoginService extends BaseService {
  public async login({ email, password, captchaResponse }: { email: string, password: string, captchaResponse?: string }) {
    return this.client.post('/login?spot=true', {
      email: email.trim(),
      password,
      'g-recaptcha-response': captchaResponse,
    })
      .then((r) => {
        if (r.ok) {
          return r.json();
        }
      })
      .catch((e) => {
        throw e;
      });
  }
}
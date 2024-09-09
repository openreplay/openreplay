import BaseService from "./BaseService";

export default class LoginService extends BaseService {
  public async login({ email, password, captchaResponse }: { email: string, password: string, captchaResponse?: string }) {
    return this.client.post('/login', {
      email: email.trim(),
      password,
      'g-recaptcha-response': captchaResponse,
    })
      .then((r) => {
          return r.json();
      })
      .catch((e) => {
        return e.response.json()
          .then((r: { errors: string[] }) => {
            throw r.errors;
          });
      });
  }
}
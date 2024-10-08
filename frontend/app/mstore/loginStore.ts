import { makeAutoObservable } from 'mobx';
import { loginService } from "../services";
import { isTokenExpired } from "../utils";

const spotTokenKey = "___$or_spotToken$___"

class LoginStore {
  email = '';
  password = '';
  captchaResponse?: string;
  spotJWT?: string;

  constructor() {
    makeAutoObservable(this);
    const token = localStorage.getItem(spotTokenKey);
    if (token && !isTokenExpired(token)) {
      this.spotJWT = token;
    }
  }

  getSpotJWT = async (): Promise<string | null> => {
    if (this.spotJwtPending) {
      let tries = 0
      return new Promise<string | null>((resolve) => {
        const interval = setInterval(() => {
          if (!this.spotJwtPending && this.spotJWT) {
            clearInterval(interval)
            resolve(this.spotJWT)
          }
          if (tries > 50) {
            clearInterval(interval)
            resolve(null)
          }
        }, 100)
      })
    }
    return this.spotJWT ?? null
  }

  setEmail = (email: string) => {
    this.email = email;
  }

  setPassword = (password: string) => {
    this.password = password;
  }

  setCaptchaResponse = (captchaResponse: string) => {
    this.captchaResponse = captchaResponse;
  }

  setSpotJWT = (spotJWT: string) => {
    this.spotJWT = spotJWT;
    localStorage.setItem(spotTokenKey, spotJWT);
  }

  spotJwtPending = false
  setSpotJwtPending = (pending: boolean) => {
    this.spotJwtPending = pending
  }

  generateJWT = async () => {
    if (this.spotJwtPending) {
      return
    }
    this.setSpotJwtPending(true)
    try {
      const resp = await loginService.login({
        email: this.email,
        password: this.password,
        captchaResponse: this.captchaResponse
      })
      this.setSpotJWT(resp.spotJwt)
      return resp
    } catch (e) {
      throw e
    } finally {
      this.setSpotJwtPending(false)
    }
  }

  invalidateSpotJWT = () => {
    this.spotJWT = undefined
    localStorage.removeItem(spotTokenKey)
  }
}

export default LoginStore;
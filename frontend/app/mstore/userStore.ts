import Account from 'Types/account';
import Client from 'Types/client';
import copy from 'copy-to-clipboard';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { toast } from 'react-toastify';

import { userService } from 'App/services';
import { deleteCookie } from 'App/utils';

import User from 'App/mstore/types/user';
import i18next, { TFunction } from 'i18next';

class UserStore {
  t: TFunction;

  list: User[] = [];

  instance: User | null = null;

  page: number = 1;

  pageSize: number = 10;

  searchQuery: string = '';

  modifiedCount: number = 0;

  loading: boolean = false;

  saving: boolean = false;

  limits: any = {};

  initialDataFetched: boolean = false;

  account = new Account();

  siteId: string | null = null;

  passwordRequestError: boolean = false;

  passwordErrors: string[] = [];

  tenants: any[] = [];

  onboarding: boolean = false;

  sites: any[] = [];

  jwt: string | null = null;

  spotJwt: string | null = null;

  errors: any[] = [];

  loginRequest = {
    loading: false,
    errors: [] as string[],
  };

  fetchInfoRequest = {
    loading: false,
    errors: [] as string[],
  };

  signUpRequest = {
    loading: false,
    errors: [] as string[],
  };

  updatePasswordRequest = {
    loading: false,
    errors: [] as string[],
  };

  scopeState: number | null = null;

  client = new Client();

  authStore: AuthStore;

  constructor(authStore: AuthStore, t: TFunction) {
    this.t = t;
    makeAutoObservable(this);
    this.authStore = authStore;

    void makePersistable(
      this,
      {
        name: 'UserStore',
        properties: [
          'siteId',
          'tenants',
          'jwt',
          'spotJwt',
          'scopeState',
          'onboarding',
          {
            key: 'account',
            serialize: (acc) =>
              acc.id ? JSON.stringify(acc.toData()) : JSON.stringify({}),
            deserialize: (json) => new Account(JSON.parse(json)),
          },
        ],
        storage: window.localStorage,
      },
      {
        delay: 200,
      },
    );
  }

  get isEnterprise() {
    return (
      this.account?.edition === 'ee' ||
      this.authStore.authDetails?.edition === 'ee'
    );
  }

  get isSSOSupported() {
    return this.isEnterprise || this.account?.edition === 'msaas' || this.authStore.authDetails?.edition === 'msaas';
  }

  get isLoggedIn() {
    return Boolean(this.jwt);
  }

  fetchLimits = (): Promise<any> =>
    new Promise((resolve, reject) => {
      userService
        .getLimits()
        .then((response: any) => {
          runInAction(() => {
            this.setLimits(response);
          });
          resolve(response);
        })
        .catch((error: any) => {
          reject(error);
        });
    });

  setLimits = (limits: any) => {
    this.limits = limits;
  };

  initUser = (user?: User): Promise<void> =>
    new Promise((resolve) => {
      if (user) {
        this.instance = new User().fromJson(user.toJson());
      } else {
        this.instance = new User();
      }
      resolve();
    });

  updateKey = (key: keyof this, value: any) => {
    // @ts-ignore
    this[key] = value;

    if (key === 'searchQuery') {
      this.page = 1;
    }
  };

  updateUser = (user: User) => {
    const index = this.list.findIndex((u) => u.userId === user.userId);
    if (index > -1) {
      this.list[index] = user;
    }
  };

  fetchUser = (userId: string): Promise<any> => {
    this.loading = true;
    return new Promise((resolve, reject) => {
      userService
        .one(userId)
        .then((data) => {
          runInAction(() => {
            this.instance = new User().fromJson(data);
          });
          resolve(data);
        })
        .catch((error) => {
          runInAction(() => {
            this.loading = false;
          });
          reject(error);
        })
        .finally(() => {
          runInAction(() => {
            this.loading = false;
          });
        });
    });
  };

  fetchUsers = (): Promise<any> => {
    this.loading = true;
    return new Promise((resolve, reject) => {
      userService
        .all()
        .then((response) => {
          runInAction(() => {
            this.list = response.map((user: any) => new User().fromJson(user));
          });
          resolve(response);
        })
        .catch((error) => {
          runInAction(() => {
            this.loading = false;
          });
          reject(error);
        })
        .finally(() => {
          runInAction(() => {
            this.loading = false;
          });
        });
    });
  };

  saveUser = (user: User): Promise<any> => {
    this.saving = true;
    const wasCreating = !user.userId;
    return new Promise((resolve, reject) => {
      userService
        .save(user)
        .then((response) => {
          runInAction(() => {
            const newUser = new User().fromJson(response);
            if (wasCreating) {
              this.modifiedCount -= 1;
              this.list.push(newUser);
              toast.success(this.t('User created successfully'));
            } else {
              this.updateUser(newUser);
              toast.success(this.t('User updated successfully'));
            }
          });
          resolve(response);
        })
        .catch(async (e) => {
          const err = await e.response?.json();
          runInAction(() => {
            this.saving = false;
          });
          const errStr = err.errors[0]
            ? err.errors[0].includes('already exists')
              ? this.t(
                "This email is already linked to an account or team on OpenReplay and can't be used again.",
              )
              : err.errors[0]
            : this.t('Error saving user');
          toast.error(errStr);
          reject(e);
        })
        .finally(() => {
          runInAction(() => {
            this.saving = false;
          });
        });
    });
  };

  deleteUser = (userId: string): Promise<any> => {
    this.saving = true;
    return new Promise((resolve, reject) => {
      userService
        .delete(userId)
        .then((response) => {
          runInAction(() => {
            this.modifiedCount += 1;
            this.list = this.list.filter((user) => user.userId !== userId);
          });
          resolve(response);
        })
        .catch((error) => {
          runInAction(() => {
            this.saving = false;
          });
          toast.error(this.t('Error deleting user'));
          reject(error);
        })
        .finally(() => {
          runInAction(() => {
            this.saving = false;
          });
        });
    });
  };

  copyInviteCode = (userId: string): void => {
    const content = this.list.find((u) => u.userId === userId)?.invitationLink;
    if (content) {
      copy(content);
      toast.success(this.t('Invite code copied successfully'));
    } else {
      toast.error(this.t('Invite code not found'));
    }
  };

  generateInviteCode = (userId: string): Promise<any> => {
    this.saving = true;
    const promise = new Promise((resolve, reject) => {
      userService
        .generateInviteCode(userId)
        .then((response) => {
          runInAction(() => {
            const index = this.list.findIndex((u) => u.userId === userId);
            if (index > -1) {
              this.list[index].updateKey('isExpiredInvite', false);
              this.list[index].updateKey(
                'invitationLink',
                response.invitationLink,
              );
            }
            copy(response.invitationLink);
          });
          resolve(response);
        })
        .catch((error) => {
          runInAction(() => {
            this.saving = false;
          });
          reject(error);
        })
        .finally(() => {
          runInAction(() => {
            this.saving = false;
          });
        });
    });

    toast.promise(promise, {
      pending: this.t('Generating an invite code...'),
      success: this.t('Invite code generated successfully'),
    });

    return promise;
  };

  syntheticLogin = ({ data }: any) => {
    this.account = new Account(data.user);
    this.spotJwt = data.spotJwt;
    this.scopeState = data.scopeState;
    this.loginRequest = { loading: false, errors: [] };
  };

  syntheticLoginError = (errors: any) => {
    deleteCookie('jwt', '/', 'openreplay.com');
    this.loginRequest = {
      loading: false,
      errors: errors || [],
    };
  };

  login = async (params: any) => {
    this.loginRequest = { loading: true, errors: [] };
    try {
      const data = await userService.login(params);
      runInAction(() => {
        this.account = new Account(data.user);
        this.jwt = data.jwt;
        this.spotJwt = data.spotJwt;
        this.scopeState = data.scopeState;
        this.loginRequest = { loading: false, errors: [] };
      });
    } catch (error: any) {
      runInAction(() => {
        console.log('Login failed', error);
        deleteCookie('jwt', '/', 'openreplay.com');
        this.loginRequest = {
          loading: false,
          errors: error.errors || [],
        };
      });
    }
  };

  signup = async (params: any) => {
    runInAction(() => {
      this.signUpRequest = { loading: true, errors: [] };
    });
    try {
      const data = await userService.signup(params);
      runInAction(() => {
        this.account = new Account(data.user);
        this.scopeState = data.scopeState;
        this.spotJwt = data.spotJwt;
        this.jwt = data.jwt;
        this.signUpRequest = { loading: false, errors: [] };
      });
    } catch (error) {
      runInAction(() => {
        this.signUpRequest = {
          loading: false,
          errors: error.response?.errors || [],
        };
      });
      toast.error(
        this.t('Error signing up; please check your data and try again'),
      );
    } finally {
      runInAction(() => {
        this.signUpRequest.loading = false;
      });
    }
  };

  resetPassword = async (params: any) => {
    runInAction(() => {
      this.loading = true;
    });
    try {
      const data = await userService.resetPassword(params);
      runInAction(() => {
        this.account = new Account(data.user);
        this.jwt = data.jwt;
        this.spotJwt = data.spotJwt;
      });
    } catch (e) {
      toast.error(e.message || this.t('Error resetting your password; please try again'));
      throw e;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  };

  requestResetPassword = async (params: any) => {
    this.loading = true;
    try {
      await userService.requestResetPassword(params);
    } catch (error) {
      throw error;
    } finally {
      this.loading = false;
    }
  };

  updatePassword = async (params: any) => {
    runInAction(() => {
      this.updatePasswordRequest = { loading: true, errors: [] };
    });
    try {
      const data = (await userService.updatePassword(params)) as {
        jwt: string;
        spotJwt: string;
        data: any;
      };
      runInAction(() => {
        this.jwt = data.jwt;
        this.spotJwt = data.spotJwt;
        this.scopeState = data.data.scopeState;
        this.updatePasswordRequest = { loading: false, errors: [] };
      });
      toast.success(this.t('Successfully changed password'));
      return data;
    } catch (e: any) {
      toast.error(e.message || this.t('Failed to updated password.'));
      throw e;
    } finally {
      runInAction(() => {
        this.updatePasswordRequest = {
          loading: false,
          errors: [],
        };
      });
    }
  };

  fetchUserInfo = async () => {
    runInAction(() => {
      this.fetchInfoRequest = { loading: true, errors: [] };
    });
    try {
      const data = await userService.fetchUserInfo();
      runInAction(() => {
        this.account = new Account(data);
        this.scopeState = data.scopeState;
        this.passwordErrors = [];
      });
    } catch (error) {
      runInAction(() => {
        deleteCookie('jwt', '/', 'openreplay.com');
        this.resetStore();
      });
    } finally {
      runInAction(() => {
        this.fetchInfoRequest = { loading: false, errors: [] };
      });
    }
  };

  logout = async () => {
    try {
      await userService.logout();
      runInAction(() => {
        deleteCookie('jwt', '/', 'openreplay.com');
        this.resetStore();
      });
    } catch (error) {
      // TODO error handling
    }
  };

  updateClient = async (params: any) => {
    runInAction(() => {
      this.loading = true;
    });
    try {
      await userService.updateClient(params);
      runInAction(() => {
        Object.keys(params).forEach((key) => {
          this.client[key] = params[key];
          this.account[key] = params[key];
        });
      });
    } catch (error) {
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  };

  updateJwt = ({ jwt, spotJwt }: { jwt?: string; spotJwt?: string }) => {
    this.jwt = jwt ?? null;
    this.spotJwt = spotJwt ?? null;
  };

  getJwt = () => this.jwt;

  updateAccount = async (params: any) => {
    runInAction(() => {
      this.loading = true;
    });
    try {
      const data = await userService.updateAccount(params);
      runInAction(() => {
        this.account = new Account(data);
        this.scopeState = data.scopeState;
        this.passwordErrors = [];
      });
    } catch (error) {
      // TODO error handling
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  };

  resendEmailVerification = async (email: string) => {
    try {
      await userService.resendEmailVerification(email);
    } catch (error) {
      // TODO error handling
    }
  };

  pushNewSite = (newSite: any) => {
    this.sites.push(newSite);
  };

  setOnboarding = (state: boolean = false) => {
    this.onboarding = state;
  };

  resetErrors = () => {
    this.passwordErrors = [];
    this.loginRequest.errors = [];
    this.errors = [];
  };

  updateModule = (moduleKey: string) => {
    const modules = this.account.settings?.modules || [];
    if (modules.includes(moduleKey)) {
      this.account.settings.modules = modules.filter(
        (module: string) => module !== moduleKey,
      );
    } else {
      this.account.settings.modules = [...modules, moduleKey];
    }
  };

  upgradeScope = async () => {
    try {
      await userService.changeScope(2);
      runInAction(() => {
        this.scopeState = 2;
      });
    } catch (error) {
      // TODO error handling
    }
  };

  downgradeScope = async () => {
    try {
      await userService.changeScope(1);
      runInAction(() => {
        this.scopeState = 1;
      });
    } catch (error) {
      // TODO error handling
    }
  };

  resetStore = async () => {
    this.account = new Account();
    this.siteId = null;
    this.passwordRequestError = false;
    this.passwordErrors = [];
    this.tenants = [];
    this.onboarding = false;
    this.sites = [];
    this.jwt = null;
    this.spotJwt = null;
    this.errors = [];
    this.loginRequest = {
      loading: false,
      errors: [],
    };
    this.scopeState = null;
    this.client = new Client();
    this.list = [];
    this.instance = null;
    this.page = 1;
    this.pageSize = 10;
    this.searchQuery = '';
    this.modifiedCount = 0;
    this.loading = false;
    this.saving = false;
    this.limits = {};
    this.initialDataFetched = false;
  };
}

type AuthDetails = {
  tenants: boolean;
  sso: string | null;
  ssoProvider: string | null;
  enforceSSO: boolean | null;
  edition?: 'foss' | 'ee' | 'msaas';
};

class AuthStore {
  authDetails: AuthDetails = {
    tenants: false,
    sso: null,
    ssoProvider: null,
    enforceSSO: null,
    edition: 'foss',
  };

  constructor() {
    makeAutoObservable(this);

    void makePersistable(this, {
      name: 'AuthStore',
      properties: [
        'authDetails',
        {
          key: 'authDetails',
          serialize: (ad) => {
            // delete ad.edition;
            return Object.keys(ad).length > 0
              ? JSON.stringify(ad)
              : JSON.stringify({});
          },
          deserialize: (json) => {
            const ad = JSON.parse(json);
            // delete ad.edition;
            return ad;
          },
        },
      ],
      expireIn: 60000 * 60,
      removeOnExpiration: true,
      storage: window.localStorage,
    });
  }

  fetchTenants = async () => {
    try {
      const response = await userService.fetchTenants();
      runInAction(() => {
        this.authDetails = response;
      });
    } catch (error) {
      // TODO error handling
    }
  };
}

export const authStore = new AuthStore();
const userStore = new UserStore(authStore, i18next.t);

export default userStore;

import Record from 'Types/Record';
import { validateURL } from 'App/validate';

export const SECRET_ACCESS_KEY_LENGTH = 40;
export const ACCESS_KEY_ID_LENGTH = 20;

export default Record({
  username: undefined,
  token: undefined,
  url: undefined,
  provider: 'jira'
}, {
  // idKey: 'projectId',
  fromJS: ({ ...config }) => ({
    ...config,
    // projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validateFetchProjects() {
      return this.username !== '' && this.token !== '' && validateURL(this.url);
    },
    validate() {
      return true;
    },
    exists() {
      return this.token !== undefined;
    }
  }
});
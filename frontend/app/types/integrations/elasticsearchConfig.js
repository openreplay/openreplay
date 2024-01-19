import Record from 'Types/Record';
import { validateURL } from 'App/validate'

export const API_KEY_ID_LENGTH = 5;
export const API_KEY_LENGTH = 5;

export default Record({
  projectId: undefined,
  host: "",
  apiKeyId: "",
  apiKey: "",
  indexes: "*log*",
  port: 9200,
  isValid: false,
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validateKeys() {
      return this.apiKeyId.length > API_KEY_ID_LENGTH && this.apiKey.length > API_KEY_LENGTH && validateURL(this.host);
    },
    validate() {
      return this.host !== '' && this.apiKeyId !== '' && this.apiKey !== '' && this.indexes !== '' && !!this.port && 
      this.isValid && this.validateKeys();
    },
    exists() {
      return this.projectId >= 0;
    }
  }
});

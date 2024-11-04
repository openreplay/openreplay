import Record from 'Types/Record';

export default Record({
  projectId: undefined,
  accessId: '',
  accessKey: '',
  region: 'au'
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validate() {
      return this.accessKey !== '' && this.accessId !== '';
    },
    exists() {
      return this.projectId >= 0;
    }
  }
});

export const regionLabels = {
  "au": "Asia Pacific (Sydney)",
  "ca": "Canada (Central)",
  "de": "EU (Frankfurt)",
  "eu": "EU (Ireland)",
  "fed": "US East (N. Virginia)",
  "in": "Asia Pacific (Mumbai)",
  "jp": "Asia Pacific (Tokyo)",
  "us1": "US East (N. Virginia)",
  "us2": "US West (Oregon)"
};
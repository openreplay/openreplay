import Record from 'Types/Record';

export default Record({
  projectId: undefined,
  logName: '',
  serviceAccountCredentials: '',
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validate() {
      return this.serviceAccountCredentials !== '' && this.logName !== '';
    },
    exists() {
      return !!this.projectId;
    }
  }
});

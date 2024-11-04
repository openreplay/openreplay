import Record from 'Types/Record';

export default Record({
  projectId: undefined,
  apiKey: '',
  applicationKey: '',
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validate() {
      return this.applicationKey !== '' && this.apiKey !== '';
    },
    exists() {
      return this.projectId >= 0;
    }
  }
});

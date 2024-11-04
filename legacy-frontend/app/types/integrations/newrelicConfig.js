import Record from 'Types/Record';

export default Record({
  projectId: undefined,
  applicationId: '',
  xQueryKey: '',
  region: true
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validate() {
      return this.applicationId !== '' && this.xQueryKey !== '';
    },
    exists() {
      return this.projectId >= 0;
    }
  }
});

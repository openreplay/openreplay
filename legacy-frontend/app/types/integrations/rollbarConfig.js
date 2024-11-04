import Record from 'Types/Record';

export default Record({
  projectId: undefined,
  accessToken: '',
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validate() {
      return this.accessToken !== '';
    },
    exists() {
      return this.projectId !== undefined;
    }
  }
});

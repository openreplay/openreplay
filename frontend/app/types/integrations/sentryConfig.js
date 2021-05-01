import Record from 'Types/Record';

export default Record({
  projectId: undefined,
  organizationSlug: '',
  projectSlug: '',
  token: '',
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validate() {
      return this.organizationSlug !== '' && this.projectSlug !== '' && this.token !== '';
    },
    exists() {
      return this.projectId >= 0;
    }
  }
});

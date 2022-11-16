import Record from 'Types/Record';

export default Record({
  projectId: undefined,
  sentryUrl: '',
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
      return this.sentryUrl !== '' && this.organizationSlug !== '' && this.projectSlug !== '' && this.token !== '';
    },
    exists() {
      return this.projectId >= 0;
    }
  }
});

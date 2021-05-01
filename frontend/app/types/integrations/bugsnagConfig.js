import Record from 'Types/Record';

export const tokenRE = /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i;

export default Record({
  projectId: undefined,
  authorizationToken: '',
  bugsnagProjectId: '',
}, {
  idKey: 'projectId',
  fromJS: ({ projectId, ...config }) => ({
    ...config,
    projectId: projectId === undefined ? projectId : `${ projectId }`,
  }),
  methods: {
    validate() {
      return this.bugsnagProjectId !== '' && tokenRE.test(this.authorizationToken);
    },
    exists() {
      return this.projectId !== undefined;
    }
  }
});

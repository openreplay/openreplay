import Record from 'Types/Record';
// import { validateURL } from 'App/validate';

export const SECRET_ACCESS_KEY_LENGTH = 40;
export const ACCESS_KEY_ID_LENGTH = 20;

export default Record(
    {
        projectId: undefined,
        provider: 'github',
        token: '',
    },
    {
        idKey: 'projectId',
        fromJS: ({ projectId, ...config }) => ({
            ...config,
            projectId: projectId === undefined ? projectId : `${projectId}`,
        }),
        methods: {
            validate() {
                // return this.jiraProjectId !== '' && this.username !== '' && this.token !== '' && validateURL(this.url);
                return this.token !== '';
            },
            exists() {
                return !!this.token;
            },
        },
    }
);

export const regionLabels = {
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    'ap-east-1': 'Asia Pacific (Hong Kong)',
    'ap-south-1': 'Asia Pacific (Mumbai)',
    'ap-northeast-2': 'Asia Pacific (Seoul)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    'ca-central-1': 'Canada (Central)',
    'eu-central-1': 'EU (Frankfurt)',
    'eu-west-1': 'EU (Ireland)',
    'eu-west-2': 'EU (London)',
    'eu-west-3': 'EU (Paris)',
    'eu-north-1': 'EU (Stockholm)',
    'me-south-1': 'Middle East (Bahrain)',
    'sa-east-1': 'South America (São Paulo)',
};

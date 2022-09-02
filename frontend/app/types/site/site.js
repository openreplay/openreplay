import Record from 'Types/Record';
import GDPR from './gdpr';

export const RED = 'red';
export const YELLOW = 'yellow';
export const GREEN = 'green';

export const STATUS_COLOR_MAP = {
  [ RED ]: '#CC0000',
  [ YELLOW ]: 'orange',
  [ GREEN ]: 'green',
}

export default Record({
  id: undefined,
  name: '',
  host: '',
  status: RED,
  lastRecordedSessionAt: undefined,
  gdpr: GDPR(),
  recorded: undefined,
  stackIntegrations: false,
  projectKey: undefined,
  trackerVersion: undefined,
  saveRequestPayloads: false,
}, {
  idKey: 'id',
  methods: {
    validate() {
      return this.name.length > 0;
    },

    toData() {
      const js = this.toJS();

      delete js.key;
      delete js.gdpr;
      return js;
    },
  },
  fromJS: ({ gdpr, projectId, name, ...rest }) => ({
    ...rest,
    host: name,
    name: name,
    id: projectId === undefined ? undefined : `${ projectId }`, //?!?!?!?!?
    gdpr: GDPR(gdpr),
  })
});

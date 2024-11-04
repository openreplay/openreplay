import Record from 'Types/Record';
import { DateTime } from 'luxon';

export default Record({
  rehydrationId: undefined,
  name: '',
  startAt: '',
  endAt: '',
  createdAt: undefined,
  state: undefined, // in_progress, fail, succeess
  createdBy: undefined,
  sessionsCount: undefined
}, {
  idKey: 'rehydrationId',
  methods: {
    validate() {
      return this.name !== '';
    },
    period() {
      return this.startAt.toFormat('LLL dd, yyyy') + ' - ' + this.endAt.toFormat('LLL dd, yyyy');
    },
    isInProgress() {
      return this.state === 'in progress';
    }
  },
  fromJS: ({ startTs, endTs, createdAt, userId, ...rest }) => ({
    ...rest,
    createdBy: userId,
    createdAt: createdAt && DateTime.fromMillis(createdAt || 0),
    endAt: endTs && DateTime.fromMillis(endTs || 0),
    startAt: startTs && DateTime.fromMillis(startTs || 0),
  }),
});

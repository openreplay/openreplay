import Record from 'Types/Record';
import { DateTime } from 'luxon';

export default Record({
  announcementId: undefined,
  type: undefined,
  title: undefined,
  description: undefined,
  imageUrl: undefined,
  createdAt: undefined,
  viewed: undefined,
  buttonUrl: undefined,
  buttonText: undefined
}, {
  idKey: 'announcementId',
  fromJS: ({ createdAt, ...rest }) => ({
    ...rest,
    createdAt: createdAt ? DateTime.fromMillis(createdAt) : undefined,
  }),
});

import Record from 'Types/Record';
import { DateTime } from 'luxon';

const ASSIGN = 'assign';
const MESSAGE = 'message';
const OPEN = 'open';
const CLOSE = 'close';

export const TYPES = { ASSIGN, MESSAGE, OPEN, CLOSE };

const Activity = Record({
  id: undefined,
  type: '',
  author: '',
  // thread_id: undefined,
  createdAt: undefined,
  // assigned_to: undefined,
  // user_id: undefined,
  message: '',
  user: ''
})

// const Assign = Activity.extend({
//   type: ASSIGN,
// })

// const Message = Activity.extend({
//   type: MESSAGE,
// })

// const Open = Activity.extend({
//   type: OPEN,
// })

// const Close = Activity.extend({
//   type: CLOSE,
// })

// const Open = Activity.extend({
//   type: OPEN,
// })

export default function(activity = {}) {
  // if (activity.type === ASSIGN) return Assign(activity);
  // if (activity.type === MESSAGE) return Message(activity);
  // if (activity.type === OPEN) return Open(activity);
  // if (activity.type === CLOSE) return Close(activity);
  return Activity({
    ...activity,
    createdAt: activity.createdAt ? DateTime.fromMillis(activity.createdAt, {}).toUTC() : undefined,
  });
}


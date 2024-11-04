import { DateTime } from 'luxon';
import { Record } from 'immutable';
import { Map } from 'immutable';

const ALERT = 'alert';

export const LEVEL = {
  ALERT,
};

class Notification extends Record({
  notificationId: '',
  level: '',
  editedAt: '',
  createdAt: '',
  text: '',
  link: '',
  viewed: undefined,
  title: '',
  description: '',
  type: '',
  filterKey: '',
  options: Map({ source: '', sourceId: '', projectId: '', sourceMeta: ''})
}) {
  idKey = 'notificationId'
}

function getFilterKey(type) {
  let filterKey = ''
  if (type === 'threshold' || type === 'change')
    filterKey = 'alert';
  else if (type === 'scheduled')
    filterKey = 'synthetic';
  
  return filterKey;
}

function fromJS(notification = {}) {
  if (notification instanceof Notification) return notification;

  const createdAt = DateTime.fromMillis(notification.createdAt ? notification.createdAt : 0);  
  const options = notification.options ? notification.options : Map({ source: '', sourceId: '', projectId: '', sourceMeta: ''});
  
  if (options.sourceMeta === 'scheduler') // TODO should be fixed in API
    options.sourceMeta = 'scheduled'

  return new Notification({
    ...notification,
    createdAt,    
    filterKey: getFilterKey(options.sourceMeta),
  });
}

export default fromJS;

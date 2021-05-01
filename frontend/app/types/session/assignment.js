import Record from 'Types/Record';
import Activity from './activity';
import { List } from 'immutable';
import { DateTime } from 'luxon';
import { validateName, notEmptyString } from 'App/validate';

export default Record({
  id: undefined,
  title: '',
  timestamp: undefined,
  creatorId: undefined,
  sessionId: undefined,
  projectId: '',
  siteId: undefined,
  activities: List(),
  closed: false,
  assignee: '',
  commentsCount: undefined,
  issueType: '',
  description: '',
  iconUrl: ''
}, {
  fromJS: (assignment) => ({
    ...assignment,
    timestamp: assignment.createdAt ? DateTime.fromISO(assignment.createdAt) : undefined,
    activities: assignment.comments ? List(assignment.comments).map(activity => {
      if (assignment.users) {
        activity.user = assignment.users.filter(user => user.id === activity.author).first();
      }
      return Activity(activity)
    }) : List()
  }),
  methods: {
		validate: function() {
      return  !!this.projectId && !!this.issueType &&
              notEmptyString(this.title) && notEmptyString(this.description)
    },
    toCreate: function() {
      return {
        title: this.title,
        description: this.description,
        assignee: this.assignee,
        issueType: this.issueType
      }
    }
	}
})

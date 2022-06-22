import { storiesOf } from '@storybook/react';
import { List } from 'immutable';
import IssuesModal from './IssuesModal';
import IssueHeader from './IssueHeader';
import IssueComment from './IssueComment';
import IssueCommentForm from './IssueCommentForm';
import IssueDetails from './IssueDetails';
import IssueForm from './IssueForm';
import IssueListItem from './IssueListItem';
import IssueDescription from './IssueDescription';

const description = {
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "test para"
        }
      ]
    },
    {
      "type": "blockquote",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "test quote"
            }
          ]
        }
      ]
    },
    {
      "type": "rule"
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "another para"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": []
    },
    {
      "type": "paragraph",
      "content": []
    },
    {
      "type": "codeBlock",
      "attrs": {},
      "content": [
        {
          "type": "text",
          "text": "var d = \"test code\"\nvar e = \"test new line\""
        }
      ]
    },
    {
      "type": "paragraph",
      "content": []
    }
  ]
}
const issueTypeIcons = {
  '1': 'https://openreplay.atlassian.net/secure/viewavatar?size=medium&avatarId=10310&avatarType=issuetype',
}
const issueTypes = [
  {
    id: 1,
    iconUrl: 'https://openreplay.atlassian.net/secure/viewavatar?size=medium&avatarId=10310&avatarType=issuetype',
    name: 'Improvement'
  },
  {
    id: 2,
    iconUrl: 'https://openreplay.atlassian.net/secure/viewavatar?size=medium&avatarId=10310&avatarType=issuetype',
    name: 'Bug'
  }
]
const user = {
  id: 1,
  name: 'test',
  avatarUrls: {
   "16x16": "https://secure.gravatar.com/avatar/900294aa68b33490b16615b57e9709fc?d=https%3A%2F%2Favatar-management--avatars.us-west-2.prod.public.atl-paas.net%2Finitials%2FMO-3.png&size=16&s=16",
   "24x24": "https://secure.gravatar.com/avatar/900294aa68b33490b16615b57e9709fc?d=https%3A%2F%2Favatar-management--avatars.us-west-2.prod.public.atl-paas.net%2Finitials%2FMO-3.png&size=24&s=24"
  }
}
const activities = [
  {
    id: 1,
    message: {
      "version": 1,
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "First Para"
            }
          ]
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Second para"
            }
          ]
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Third para",
              "marks": [
                {
                  "type": "strong"
                }
              ]
            }
          ]
        },
        {
          "type": "blockquote",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Quote"
                }
              ]
            }
          ]
        },
        {
          "type": "paragraph",
          "content": []
        },
        {
          "type": "codeBlock",
          "attrs": {},
          "content": [
            {
              "type": "text",
              "text": "alert('test')\nvar dd = \"Another line\""
            }
          ]
        },
        {
          "type": "rule"
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "mention",
              "attrs": {
                "id": "5d8398868a50e80c2feed3f6",
                "text": "Someone"
              }
            },
            {
              "type": "text",
              "text": " "
            }
          ]
        },
        {
          "type": "paragraph",
          "content": []
        },
        {
          "type": "codeBlock",
          "attrs": {
            "language": "javascript"
          },
          "content": [
            {
              "type": "text",
              "text": "var d = \"test\""
            }
          ]
        },
        {
          "type": "paragraph",
          "content": []
        }
      ]
    },
    author: 1,
    user: user
  },
  {
    id: 1,
    message: {
      "version": 1,
      "type": "doc",
      "content": [
          {
              "type": "paragraph",
              "content": [
                  {
                      "type": "text",
                      "text": "happy debugging"
                  }
              ]
          }
      ]
  },
    author: 1,
    user: user
  }
]
const issues = [
  {
    title: 'Crash Report - runtime error: index out of range',
    description: description,
    commentsCount: 4,
    activities: List(activities),
    assignee: user.id,
    issueType: 1,
    id: 'APP-222'
  },
  {
    title: 'this is the second one',
    description: description,
    commentsCount: 10,
    activities: activities,
    assignee: user.id,
    issueType: 1,
    id: 'APP-333'
  },
  {
    title: 'this is the third one',
    description: description,
    commentsCount: 0,
    activities: activities,
    assignee: user.id,
    issueType: 1,
    id: 'APP-444'
  }
];

const onIssueClick = (issue) => {
  console.log(issue);
}

storiesOf('Issues', module)
  .add('IssuesModal', () => (
    <IssuesModal issues={ issues } />
  ))
  .add('IssueHeader', () => (
    <IssueHeader issue={ issues[0] } typeIcon={ issueTypeIcons[1] }/>
  ))
  .add('IssueComment', () => (
    <div className="p-4">
      <IssueComment activity={ activities[0] } />
    </div>
  ))
  .add('IssueDescription', () => (
    <div className="p-4 bg-gray-100">
      <IssueDescription description={ description } />
    </div>
  ))
  .add('IssueCommentForm', () => (
    <IssueCommentForm />
  ))
  .add('IssueDetails', () => (
    <IssueDetails
      sessionId={ 1}
      issue={ issues[0] }
      users={ List([user]) }
      issueTypeIcons={ issueTypeIcons }
    />
  ))
  .add('IssueListItem', () => (
    <IssueListItem issue={ issues[0] } icon={ issueTypeIcons[1] } user={ user } />
  ))
  .add('IssueForm', () => (
    <div className="p-4">
      <IssueForm issueTypes={ List(issueTypes) } />
    </div>
  ))


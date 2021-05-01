import { storiesOf } from '@storybook/react';
import SessionsMenu from './SessionsMenu/SessionsMenu';
import SessionItem from 'Shared/SessionItem';
import SessionStack from 'Shared/SessionStack';
import Session from 'Types/session';
import SessionListHeader from './SessionList/SessionListHeader';
import SavedFilter from 'Types/filter/savedFilter';
import { List } from 'immutable';

var items = [
  {
    "watchdogId": 140,
    "projectId": 1,
    "type": "errors",
    "payload": {
      "threshold": 0,
      "captureAll": true
    } 
  },
  {
    "watchdogId": 139,
    "projectId": 1,
    "type": "bad_request",
    "payload": {
      "threshold": 0,
      "captureAll": true
    }
  },
]

var session = Session({
  "projectId": 1,
  "sessionId": "2236890417118217",
  "userUuid": "1e4bec88-fe8d-4f51-9806-716e92384ffc",
  "userId": null,
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
  "userOs": "Mac OS X",
  "userBrowser": "Chrome",
  "userDevice": "Mac",
  "userCountry": "FR",
  "startTs": 1584132239030,
  "duration": 618469,
  "eventsCount": 24,
  "pagesCount": 18,
  "errorsCount": 0,
  "watchdogs": [
    137,
    143
  ],
  "favorite": false,
  "viewed": false
})

var savedFilters = [
  SavedFilter({filterId: 1, name: 'Something', count: 10, watchdogs: []})
]

storiesOf('Bug Finder', module)
  .add('Sessions Menu', () => (
    <SessionsMenu items={ items } />
  ))
  .add('Sessions Item', () => (
      <SessionItem key={1} session={session}/>
  ))
  .add('Session List Header', () => (
    <SessionListHeader />
  ))
  .add('Sessions Stack', () => (
    <SessionStack flow={savedFilters[0]} />
  ))

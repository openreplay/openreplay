import { storiesOf } from '@storybook/react';
import SideMenuItem from './SideMenuItem';
import { Avatar, ErrorItem, ErrorFrame, ErrorDetails, TimelinePointer } from 'UI';
import Error from 'Types/session/error';
import ErrorStackModel from 'Types/session/errorStack';

const errorStack = ErrorStackModel(
  {
    "url": "https://staging.openreplay.com/app-1cac32a.js",
    "args": [],
    "func": "FilterModal._this.onFilterClick",
    "line": 75,
    "column": 100,
    "context": [
      [ 70, "      });" ],
      [ 71, "    } else {" ],
      [ 72, "      props.fetchSession(props.sessionId).then(() => {" ],
      [ 73, "        const { session } = this.props;" ],
      [ 74, "        if (!session.sessionId) return; // shouldn't be. On first load component constructed twise somewhy" ],
      [ 75, "        initPlayer(session, props.jwt);" ],
      [ 76, "      });" ],
      [ 77, "    }" ],
      [ 78, "  }" ],
      [ 79, "" ],
      [ 80, "  componentDidUpdate(prevProps) {" ]
    ]
  }
);

const errors = [
  Error({
    "sessionId": 2315691667741445,
    "messageId": 220546,
    "timestamp": 1585335179312,
    "errorId": "1_5c3b207b20a36c08c408c4990b9f5cbc",
    "projectId": 1,
    "source": "js_exception",
    "name": "TypeError",
    "message": "Cannot read property '0' of undefined",
    "payload": {
      "mode": "stack",
      "stack": [
        {
          "url": "https://staging.openreplay.com/app-1cac32a.js",
          "args": [],
          "func": "FilterModal._this.onFilterClick",
          "line": 3233,
          "column": 62,
          "context": []
        },
        {
          "url": "https://staging.openreplay.com/app-1cac32a.js",
          "args": [],
          "func": "onClick",
          "line": 3342,
          "column": 25,
          "context": []
        },
      ]
    },
    "status": "unresolved",
    "parentErrorId": null
  })
]

storiesOf('UI Components', module)
  .add('SideMenuItem', () => (
    <SideMenuItem title="Menu Label" />
  ))
  .add('SideMenuItem active', () => (
    <SideMenuItem title="Menu Label" active />
  ))
  .add('Avatar', () => (
    <Avatar />
  ))
  .add('ErrorItem', () => (
    <ErrorItem error={errors[0]} />
  ))
  .add('ErrorFrame', () => (
    <ErrorFrame stack={errorStack} />
  ))
  .add('ErrorDetails', () => (
    <div className="p-4 bg-white">
      <ErrorDetails error={errors[0]} />
    </div>
  ))
  .add('Timeline POinter', () => (
    <TimelinePointer />
  ))


import { storiesOf } from '@storybook/react';
import { List } from 'immutable';
import EventGroup from './EventsBlock/Event';

const groups = [
  {
    "page": {
      "key": "Location_257",
      "time": 2751,
      "type": "LOCATION",
      "url": "/login",
      "pageLoad": false,
      "fcpTime": 6787,
      "loadTime": 7872,
      "domTime": 5821,
      "referrer": "Search Engine"
    },
    "events": [
      {
        "sessionId": 2406625057772570,
        "messageId": 76446,
        "timestamp": 1586722257371,
        "label": "Device Memory: 8.19GB",
        "type": "CLICKRAGE",
        "count": 3
      },
      {
        "key": "Click_256",
        "time": 13398,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_262",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Input_256",
        "time": 13438,
        "type": "INPUT",
        "target": {
          "key": "record_263",
          "path": "",
          "label": null
        },
        "value": null
      }
    ]
  },
  {
    "page": {
      "key": "Location_258",
      "time": 15841,
      "type": "LOCATION",
      "url": "/1/sessions",
      "pageLoad": false,
      "fcpTime": null,
      "loadTime": null,
      "domTime": null,
      "referrer": ""
    },
    "events": [
      {
        "key": "Click_257",
        "time": 24408,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_264",
          "path": "",
          "label": null
        }
      }
    ]
  },
  {
    "page": {
      "key": "Location_259",
      "time": 25019,
      "type": "LOCATION",
      "url": "/1/session/2303531983744788",
      "pageLoad": false,
      "fcpTime": null,
      "loadTime": null,
      "domTime": null,
      "referrer": ""
    },
    "events": [
      {
        "key": "Click_258",
        "time": 31134,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_265",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_259",
        "time": 32022,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_266",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_260",
        "time": 35951,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_267",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_261",
        "time": 164029,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_268",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_262",
        "time": 169739,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_269",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_263",
        "time": 170524,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_270",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_264",
        "time": 172580,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_271",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_265",
        "time": 173102,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_272",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_266",
        "time": 173698,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_273",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_267",
        "time": 173867,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_274",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_268",
        "time": 174599,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_275",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_269",
        "time": 175148,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_276",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_270",
        "time": 175779,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_277",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_271",
        "time": 176658,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_278",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_272",
        "time": 177267,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_279",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_273",
        "time": 187025,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_280",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_274",
        "time": 189787,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_281",
          "path": "",
          "label": null
        }
      },
      {
        "key": "Click_275",
        "time": 191326,
        "type": "CLICK",
        "targetContent": "",
        "target": {
          "key": "record_282",
          "path": "",
          "label": null
        }
      }
    ]
  }
]

// storiesOf('Player', module)
//   .add('Event Group', () => (
//     <EventGroup
//       group={groups[0]}
//       selectedEvents={[]}
//     />
//   ))

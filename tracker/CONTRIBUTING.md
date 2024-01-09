> ### Please use `dev` branch as base and target branch for PRs
> ___

### Tracker structure

- messages are stored as definitions in [mobs](../mobs/messages) package and are auto generated
- modules are smaller bits that expand functionality and should be used as a base for **all** new features, 
they share similar structure as plugins:
```ts
// tracker/main/modules/battery.ts
import { App } from "../app";
import { BatteryAlert } from '../messages'

export function BatteryAlertManager(sendMessage: App['send']) {
  // do stuff, i.e
  navigator.getBattery(battery => {
    battery.addEventListener("levelchange", () => {
      if (battery.level < 30) {
        app.send(BatteryAlert(level))
      }
    });
  })
}

// tracker/main/app/index.ts
// tracker constructor
this.batteryAlertManager = new BatteryAlertManager(this.send)

```
> Bear in mind, that for easier testing and debugging, 
> they should only accept required methods and not the whole app. They can be represented as classes as well.

- Observer is a parent class that creates MutationObserver and tracks HTML changes for base app and iframes
- Webworker handles message batch encoding (into byte array), queueing and sending all data to server,
- Other core modules (mouse, canvas, node counter, etc) resign in /app.
- Plugins are functions that expand tracker functionality but are to specific to be included in the code: redux tracker, 
vuex, zustand, assist library etc

### Workflow 
While creating a specific behavior, like addon for Redux, create a separate plugin instead of adding it to core lib.
Plugin is a function that accepts tracker app as argument, it can return custom hook to create named state store, or handle everything inside main body.

### Great examples

- [Redux plugin](./tracker-redux)
- [Tab activity module](./tracker/src/main/modules/tabs.ts)
- [Feature flags module](./tracker/src/main/modules/featureFlags.ts)

### Questions?

Feel free to raise an issue or come to our [Slack](https://slack.openreplay.com)
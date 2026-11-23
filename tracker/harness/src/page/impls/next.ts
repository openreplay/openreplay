import NextObserver from '@tracker/main/app/observer/next_observer.js'
import NextNodes from '@tracker/main/app/nodes/next_nodes.js'
import { fakeApp, ImplFactory, OBSERVER_OPTIONS } from './app.js'

/** The `nextObserver: true` DOM core: NextObserver + NextNodes. */
const make: ImplFactory = (send) => {
  const app = fakeApp(send)
  app.nodes = new NextNodes({
    forceNgOff: true,
    onUnregister: (id: number) => app.sanitizer.setLevel(id, 0),
  })
  const obs = new NextObserver({ app, options: OBSERVER_OPTIONS })
  return {
    start: () => obs.observe(),
    stop: () => {
      obs.disconnect()
      app.nodes.clear()
    },
    getID: (n) => app.nodes.getID(n),
    trackedNodes: () => app.nodes.getNodeCount(),
  }
}

export default make

import TopObserver from '@tracker/main/app/observer/top_observer.js'
import Nodes from '@tracker/main/app/nodes/index.js'
import { fakeApp, ImplFactory, OBSERVER_OPTIONS } from './app.js'

/** The default DOM core: TopObserver + Nodes (maintainer on). */
const make: ImplFactory = (send) => {
  const app = fakeApp(send)
  app.nodes = new Nodes({
    node_id: '__openreplay_id',
    forceNgOff: true,
    onUnregister: (id: number) => app.sanitizer.setLevel(id, 0),
  })
  const obs = new TopObserver({ app, options: OBSERVER_OPTIONS })
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

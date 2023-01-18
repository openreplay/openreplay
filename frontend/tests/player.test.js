import WebPlayer from 'App/player/web/WebPlayer';
import SimpleStore from 'App/player/common/SimpleStore'

let store = new SimpleStore({
  ...WebPlayer.INITIAL_STATE,
})

const player = new WebPlayer(store, session, false)

import { connect, createProvider } from 'react-redux'
import store from './store';

const STORE_KEY = 'playerStore';

const PlayerProvider = createProvider(STORE_KEY);
PlayerProvider.defaultProps = { store };

function connectPlayer(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  options = {}
) {
  options.storeKey = STORE_KEY
  return connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    options
  )
}

export { PlayerProvider, connectPlayer };
import { Provider } from 'react-redux';
import store from '../app/store';
import { StoreProvider, RootStore  } from '../app/mstore';

const withProvider = (Story) => (
  <Provider store={store}>
    <StoreProvider store={new RootStore()}>
      <Story />
    </StoreProvider>
  </Provider>
);

export default withProvider;

import { configure, addDecorator } from '@storybook/react';
import { Provider } from 'react-redux';
import store from '../app/store';
import { MemoryRouter } from "react-router"
import { PlayerProvider } from '../app/player/store'

const withProvider = (story) => (
  <Provider store={store}>
    <PlayerProvider>
      { story() }
    </PlayerProvider>
  </Provider>
)

// const req = require.context('../app/components/ui', true, /\.stories\.js$/);
// const issues = require.context('../app/components/Session/Issues', true, /\.stories\.js$/);
// const bugFinder = require.context('../app/components/BugFinder', true, /\.stories\.js$/);

addDecorator(withProvider);
addDecorator(story => <MemoryRouter initialEntries={['/']}>{story()}</MemoryRouter>);

// function loadStories() {
// 	req.keys().forEach(filename => req(filename));
// 	bugFinder.keys().forEach(filename => bugFinder(filename));
// }

// configure(loadStories, module);


configure(
  [
    // require.context('../app', true, /\.stories\.mdx$/),
    require.context('../app', true, /\.stories\.js$/),
  ],
  module
);
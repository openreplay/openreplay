import { configure, addDecorator } from '@storybook/react';
import { Provider } from 'react-redux';
import store from '../app/store';
import { MemoryRouter } from "react-router"

const withProvider = (story) => (
  <Provider store={store}>
      { story() }
  </Provider>
)

// const req = require.context('../app/components/ui', true, /\.stories\.js$/);
// const issues = require.context('../app/components/Session/Issues', true, /\.stories\.js$/);

addDecorator(withProvider);
addDecorator(story => <MemoryRouter initialEntries={['/']}>{story()}</MemoryRouter>);

// function loadStories() {
// 	req.keys().forEach(filename => req(filename));
// }

// configure(loadStories, module);


configure(
  [
    // require.context('../app', true, /\.stories\.mdx$/),
    require.context('../app', true, /\.stories\.js$/),
  ],
  module
);

import './init';

import { render } from 'react-dom';
import { Provider } from 'react-redux';

import store from './store';
import Router from './Router';

document.addEventListener('DOMContentLoaded', () => {
  render(
    (
      <Provider store={ store }>
        <Router />
      </Provider>
    ),
    document.getElementById('app'),
  );
});

/* @flow */
import React, { Component } from 'react';

import { AsyncStorage } from 'react-native';
import { createStore, applyMiddleware, compose } from 'redux';
import { createLogger } from 'redux-logger';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { persistStore, persistCombineReducers } from 'redux-persist';

import * as reducers from './reducers';
import ModApp from './mod';

/* eslint-disable import/no-extraneous-dependencies */
import './utils/ReactotronConfig';
import * as config from './config/dev';
import * as bugReport from './utils/bugreport';

bugReport.init(false);
const oldLogger = console.log;
console.log = (...e) => {
  oldLogger(e);
  bugReport.log(e);
};

function configureStore(onComplete: () => void) {
  const isDebuggingInChrome = __DEV__ && !!window.navigator.userAgent;
  const reduxLoggerEnable = config.reduxLoggerEnable && isDebuggingInChrome;
  const logger = createLogger({
    predicate: (getState, action) => isDebuggingInChrome,
    collapsed: true,
    duration: true,
    level: 'info',
  });
  let enhancer;
  if (__DEV__) {
    const Reactotron = require('reactotron-react-native').default;
    const createReactotronEnhancer = require('reactotron-redux');
    const reactotronEnhancer = createReactotronEnhancer(Reactotron);
    enhancer = compose(
      reactotronEnhancer,
      reduxLoggerEnable ?
        applyMiddleware(thunk, logger) : applyMiddleware(thunk),
    );
  } else {
    enhancer = compose(reduxLoggerEnable ?
      applyMiddleware(thunk, logger) : applyMiddleware(thunk), );
  }

  const storeConfig = {
    key: 'primary',
    storage: AsyncStorage
  };
  const reducer = persistCombineReducers(storeConfig, reducers);
  const store = createStore(
    reducer,
    undefined,
    enhancer
  );

  persistStore(store, null, onComplete);
  if (isDebuggingInChrome) {
    window.store = store;
  }
  return store;
}

type State = {
  isLoading: boolean,
  store: any,
};

export default class App extends Component<{}, State> {
  constructor() {
    super();
    this.state = {
      isLoading: true,
      store: configureStore(() => this.setState({ isLoading: false })),
    };
  }

  render() {
    if (this.state.isLoading) {
      return null;
    }
    return (
      <Provider store={this.state.store}>
        <ModApp />
      </Provider>
    );
  }
}

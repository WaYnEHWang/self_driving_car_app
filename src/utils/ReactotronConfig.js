/* @flow */
/* eslint-disable import/no-extraneous-dependencies */

// connect with defaults
if (__DEV__) {
  const Reactotron = require('reactotron-react-native').default;
  const { reactotronRedux } = require('reactotron-redux');

  Reactotron
    .configure()
    .useReactNative()
    .use(reactotronRedux())
    .connect();
}

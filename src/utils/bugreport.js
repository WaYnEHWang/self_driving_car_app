/* @flow */
/* global __DEV__ */
import StackTrace from 'stacktrace-js';
import { Crashlytics } from 'react-native-fabric';

// call this to start capturing any no-handled errors
exports.init = function (captureOnDebugMode: boolean) {
  if (__DEV__ && !captureOnDebugMode) {
    return;
  }

  const originalHandler = global.ErrorUtils.getGlobalHandler();
  function errorHandler(e) {
    exports.issue(e);
    if (originalHandler) {
      originalHandler(e);
    }
  }
  global.ErrorUtils.setGlobalHandler(errorHandler);
};

// user: {id: ,name: ,email: }
exports.setUser = function (user) {
  const { id, name, email } = { id: 'anony', name: 'anony', email: 'anony', ...user };
  Crashlytics.setUserIdentifier(`${id}`);
  Crashlytics.setUserName(`${name}`);
  Crashlytics.setUserEmail(`${email}`);
};

exports.setAttrs = function (obj) {
  for (let kk in obj) {
    exports.setAttr(kk, obj[kk]);
  }
};

exports.setAttr = function (key, value) {
  if (!key) return;
  if (typeof key !== 'string') key += '';
  let type = typeof value;
  if (type === 'boolean') Crashlytics.setBool(key, value);
  else if (type === 'number') Crashlytics.setNumber(key, value);
  else if (type === 'string') Crashlytics.setString(key, value);
  else Crashlytics.setString(key, JSON.stringify(value));
};

// things that will be in issue's session logs
exports.log = function (value) {
  if (!value) return;

  if (value instanceof Error) {
    value = value.stack || value.message;
  }

  if (typeof value !== 'string') value += '';
  return Crashlytics.log(value);
};

// create a new issue. fileName will be the the error message as the `index.bundle.js` is meaningless
exports.issue = function (e) {
  return StackTrace.fromError(e, { offline: true }).then(stack => stack.map((row) => {
    let { source, lineNumber } = row;
    if (!lineNumber) {
      lineNumber = parseInt(source.split(':').slice(-2, -1)) || 0;
    }
    return { fileName: e.message, lineNumber, functionName: source };
  }))
  .then((stack) => {
    Crashlytics.recordCustomExceptionName(e.message, e.message, stack);
  });
};

exports.crash = function () {
  return Crashlytics.crash();
};

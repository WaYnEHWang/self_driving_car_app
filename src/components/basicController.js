/* @flow */
/* eslint class-methods-use-this: ["error", { "exceptMethods": ["handleNoNetworkError", "handleServerError", "render"] }] */
import * as React from 'react';
import { Alert } from 'react-native';
import RequestHelper from '../utils/requestHelper';

/** Basic class for component to handle error */
class BasicController<P, S> extends React.Component<P, S> {
  componentWillUnmount() {
    this._timeoutID && clearTimeout(this._timeoutID);
  }

  _timeoutID: ?any;

  handleServerError(errorCode: number | string, selector?: Function = RequestHelper.getErrorMessage.bind(RequestHelper)): void {
    this._timeoutID = setTimeout(() => {
      const { title, message } = selector(errorCode);
      Alert.alert(title, message);
    }, 200);
  }

  handleNoNetworkError(): void {
    this._timeoutID = setTimeout(() => {
      const { title, message } = RequestHelper.getErrorMessage(RequestHelper.errorCode.NO_NETWORK);
      Alert.alert(title, message);
    }, 200);
  }

  handleFcmTokenError(): void {
    this._timeoutID = setTimeout(() => {
      const { title, message } = RequestHelper.getErrorMessage(RequestHelper.errorCode.NO_FCM_TOKEN);
      Alert.alert(title, message);
    }, 200);
  }

  render(): React.Element<any> | null {
    return null;
  }
}

module.exports = BasicController;

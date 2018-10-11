/* @flow */
import * as types from './types';

type Action = types.Action;

module.exports = {
  setIsConnected: (isConnected: boolean): Action => ({
    type: types.SET_IS_CONNECTED,
    isConnected,
  }),
  setConnectType: (connectType: string): Action => ({
    type: types.SET_CONNECT_TYPE,
    connectType,
  }),
};
